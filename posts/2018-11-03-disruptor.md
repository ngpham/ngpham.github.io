# **[[⇇]](../index.md)** Disruptor, Multithreading Message Broker

I came across [LMax Disruptor](https://lmax-exchange.github.io/disruptor/) when reading about
Log4j asynchronous logger. Since the Disruptor is rather interesting, I attempted
[something similar](
https://github.com/ngpham/conature/blob/master/util/src/main/scala/Disruptor.scala)
but at a smaller scope, just to capture the main idea of this utility.


## What is it good for?

Take Log4j for a use case. Under the hood, this logging piece is doing quite a
heavy work. It must log messages from multiple threads of execution,
it must send the logs to different endpoints (console, files, web services,...). A simple logging in
synchronous mode, single-threaded event handler, might hurt the performance. Suppose that we have
one thread per endpoint, then we have a **n-m threads multicast**
problem. If each consumer thread has a private queue, as a simple solution, then we will face
performance problem. In particular, it is the pressure on the GC, and
cache miss, both due to multiple queues shrinkage/growth - LMax actually provided experimental data
supporting this finding.

A more complex use case is at LMax themselves, which we will peek at later.

## Simple implementation

My goal is to implement the **n-m threads multicast** disruptor. My implementation is about 300
lines of Scala, a minuscule compared to LMax full fledged implementation. However, I hope to capture
just the core spirit of the disruptor, and you may find it is easier to catch the idea of the design.
Here is there requirement, in form of a compact test suite:

A Disruptor
- should manage 4 writers, 6 readers, single-item multicast of 128 integers.
- should manage 4 writers, 6 readers, random sized batch multicast of 65536 integers.
- should send/receive all messages during orderlyStop().
- should not deadlock/livelock under compelled shutdown.
- should progress with readers/writers join/leave as will.

The API is simple:
```scala
import np.conature.util.Disruptor
import Disruptor.Handler
```
That's it, we have a `Disruptor[T]` which is the broker for producing and consuming events of type
`T`. The `Handler[T]` is the interface for the consumer.
```scala
trait Handler[T] {
  def apply(x: T): Unit
  def postStop(): Unit = ()
}
```
The disruptor will spawn one thread per handler, which would `apply()` on the event, and perform
`postStop()` cleanup should the following happen: the disruptor stops, the handler encounters
non-recoverable errors, or the handler throws an `InterruptedException` to opt out.

The test is to have 4 publisher threads, which produce integers in some non-overlap range. There
are 6 readers registered with the disruptor. Each reader must assert that it receive all the
integers, each at most once. Publishers can produce items one by one or by random sized chunks.
Readers and publishers can opt out of the disruptor at any time, without affecting the ones that stay.
The disruptor has two shutdown modes; if it is a graceful shutdown, the readers must be able to
read all published items so far; if it a forced shutdown, the readers just stop asap.

While the readers are managed by the disruptor, there are no explicit publishers. From any
execution thread, the code just calls Disruptor API to reserve, write, and then publish.
For example, to write 5 items:
```scala
val numItemsToWrite = 5
val rangeToWrite = disruptor.claimNext(numItemsToWrite)

if (rangeToWrite._1 != -1)
  try
    for (j <- rangeToWrite._1 to rangeToWrite._2)
      disruptor.write(j, new Item())
  finally
    disruptor.publish(rangeToWrite)
```

`Disruptor.claimNext(nums)` will return after the disruptor reserve `nums` slots for writing.
The return is a tuple, where low value equals to `-1` signals that this disruptor has
stopped. Other wise, the caller has all slots from low to high, inclusively, for writing. Notice
that `rangeToWrite._1 = rangeToWrite._2` when caller asked for one slot. The sequences provided is
abstracted by the disruptor, caller will see an increasing sequence. `Disruptor.write()` has no
contention, while
`Disruptor.publish()` may have some contention but will eventually success. Calling `publish()` is
the signal for reader to consume the items, otherwise the whole disruptor will stuck at the
un-published reserved items. Thus the caller must always call `publish()`. Elsewhere, there are
discussions on the overflow of the sequence number, i.e. 64-bit long is so large that overflow
does not happen in practice. However, since JVM long is 2's complement, if we are careful then
overflow is not a problem.

The implementation is a ring buffer, where readers/writers are wrapped around, but never overlap.
This requires some wait strategy: as long as the slowest reader has not finished a slot, the
disruptor will not grant and any `claimNext()` that overwrites the slot. Basically we have three
choices for concurrency problem: lock-free (very difficult), blocking wait with lock (difficult),
spin lock (easy, almost a cheat). In our case, there is nothing to do beside waiting, so we have
two choices: either a real lock or a spin lock. LMax provides both wait strategies, reasoning that
spin lock is better under high load. For my simple implementation, the strategies are fixed:
writers will spin with CAS (compare and set) should they have to compete among themselves, while
writers/readers signalling are blocking wait.

## Why LMax Disruptor is fast?

LMax uses disruptor for their trading platform with high throughput and low latency, and they
engineer it to smallest details: Padding objects for cache sympathy, using `unsafe`
for direct memory access. In my implementation, using the improved Atomic API in Java 9, I did
not have to use `unsafe`. By the way, JDK 9 Atomic API has variations of `setRelease()` and
`getAcquire()`, which provides more control on memory order. However, I am not sure what is the
precise semantics in comparison to C++ terminologies.

One use case described by LMax, is to handle incoming
network messages with multiple consumers, each have a dedicate task: log, replicate, process,...
How to overcome GC overhead? Disruptor eliminates private queue for each consumer, but the ring
buffer still incurs GC task. LMax did not disclose much on this part, but some information gives
this hint: The disruptor ring buffer is a pre-allocated array, where each element is also a
pre-allocated byte array. (Or maybe the buffer itself is a huge byte array.) Using a fast serializer
(for example, [Kryo](https://github.com/EsotericSoftware/kryo)), read/write is performed directly
on the ring. With this setup, after the JVM warms up, the ring buffer is GC free.

## Conclusion

I implemented the Disruptor, with intention to use it for logging in my
[conature](https://github.com/ngpham/conature). However, I later opted for a simple event bus
design, feeling that the Disruptor is quite a niche utility. Nevertheless, it was a nice exercise.

I left out the dependency
among the consumers (the so called diamond pattern). LMax Disruptor provides API to define a set
of consumers and their dependency, before system startup. In particular, my extra requirement is to
have consumers join/leave at any time, thus the dependency graph is dynamic, and correct signalling
will be tricky.
