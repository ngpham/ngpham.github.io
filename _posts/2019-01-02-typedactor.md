---
layout: post
title:  "Typed Actor, Discipline vs Burden"
categories: programming
tags: concurrency jvm asynchronous higher-kinded-type type-lambda
---

In the previous post, I mentioned the experiment with fully typed actors, and now I completed
most of the work. The new implementation and the README was updated on
[conature](https://github.com/ngpham/conature). Let me go through the
features: asynchronous actor typed on request and possible response, support synchronous mode,
combining with networking we have a type safe RPC. The actor is capable of transparent delegating,
i.e. dispatch request to other actors for higher concurrency. Error recovery is currently limited,
but already quite useful. Full example is demonstrated on the project page, and source code,
in this post, I would talk about an interesting application of **higher-kinded type** and
**type lambda**. But first, we should look at the Actor.

## Typed Actor

```scala
trait Actor[-A, +R] {
  def !(message: A): Unit = send(message, Actor.empty)
  def ?(message: A, timeout: Duration = Duration.Inf): Future[R]
  private[conature] def send(message: A, repTo: Actor[Option[R], Any]): Unit
}
```
The Actor interface is very much like a function, indeed it behaves similarly, except for being
asynchronous and concurrent. The return is completely optional, when there is a reply, that will be
sent to the sender (if there was a sender), otherwise, a `None` object with type `Option[R]`.
This is extra safe for user code, if we forget to implement the reply-for-ask, the ask future will
fail fast. But the main advantage is to have an easy to use `?`, which is as natural as Akka
non-typed actors (which is natural but unsafe).

Conature supports networking, also requires explicit types.
```scala
val remoteActorStub: Actor[A, X] = ???
val localActualActor: Actor[B, Y] = ???

def bind[A <: Serializable, X, B, Y]
    (ra: RemoteActor[A, X], a: Actor[B, Y])(implicit ev1: A <:< B, ev2: Y <:< X)
```
A bit of type checking in the framework, that ensures safety at runtime. And now we can
have a RPC, either asynchronous or synchronous.
```scala
val fut: Future[X] = remoteActorStub ? msg_of_type_A
Await.result(fut)
```

## Event Bus with Type Classification

The interesting aspect I would like to discuss in this post, is the use of higher-kinded type and
type lambdas. When I first encountered those concepts, my reaction was mixed. It is beautiful,
powerful and all that. But what is the application? Given that most of us do not implement
scalaz, cats, shapeless, or another category library. Thus, I refrain myself from seeing nails,
even when I can borrow/steal the Mjolnir from somewhere. Until I found the nail...

In the `util` subproject, you will see a little `EventBus`. I was looking at Guava event bus,
and much appreciate its design in the Java land. The ideas in Guava event bus is similar to
Akka actor event bus: the event handlers are typed in a hierarchy, and events will be delivered
to the matched handler.

There are some shortcoming from both (I am just trying to justify for my different solution).
Akka event bus uses a Classification class to store type information, thus avoids runtime
reflection, but ActorRef is untyped. Guava event bus has type safety, but incurs runtime
reflection. It is very good that the room for error in user code is small: i.e. if you
define a handling method with more than 1 parameter. Should you want to know more, please consult
their documentations.

In Scala land, we can do thing at least differently. Scala TypeTag allows compile time type
parameter inspection, i.e. for `Handler[T]` we know a bit more about `T`. My idea is to have
generic `EventBus`, that will be specialized per user need. Instead of working with a `Handler`
interface or an `Actor`
interface, we keep the interface general, a higher-kinded type `F[_]`.
```scala
trait EventBus[F[-_]] {
  protected val reg = Map.empty[Type, SortedSet[F[_]]]
  def subscribe[T: TypeTag](handler: F[T]): Unit = ???
  def unsubscribe[T: TypeTag](handler: F[T]): Unit = ???

  def publish[T : TypeTag](event: T): Unit = {
    for ((_, v) <- reg.withFilter({case (k, v) => typeOf[T] <:< k && v.nonEmpty}))
      for (h <- v) {
        callback(h.asInstanceOf[F[T]], event)
      }
  }
  // To be specialized by user code
  def callback[T : TypeTag](handler: F[T], event: T): Unit
}
```
I omit most of the details, to focus on the main idea only.
When some instance of `F[-_]` subscribes to the event bus, we look at its type parameter (we
do not care about the type of `F`), and register it under the matched type. When some code publish
an event, its type is checked against the registry and deliver to the matched `F[_]` instances.
What `F` is, and how `F` handles the event, will be specialized in some implementation class. Also
notice that `F[-_]` is contravariant, which is a sane constraint for consumer role.

Now we can implement the specialized class. Suppose that our code has an interface for event
handler:
```scala
trait Handler[-T] { def handle(event: T): Unit }
```
Let's implement the EventBus:
```scala
class EventBusHandler extends EventBus[Handler] {
  def callback[T : TypeTag](handler: Handler[T], event: T): Unit = {
    handler.handle(event)
  }
}
```
And that is, we all set. We create the event bus as an instance of `EventBusHandler`, subscribe
anything derived from `Handler`, and publish anything, no-match-type events will be discarded.

How about an event bus where subscribers are Actor? Conature `Actor[-A,+R]` requires two
type parameters, thus we need to do more work. Since the second type parameter is for synchronous
ask, and we do not need to block in event handling, we can fix this type as the most general
type. It is covariant, so we fix it as `Any`. Then, using type lambda to project our `Actor`,
as follow:
```scala
class EventBusActor extends EventBus[({type F[-X] = Actor[X, Any]})#F] {
  def callback[T : TypeTag](handler: Actor[T, Any], event: T): Unit = { handler ! event }
}
```
We are done, any `Actor[A, B]` is considered of type `Actor[A, Any]`, which can be rewritten
into `F[A]`. Notice also how type variance must be observed.

## Conclusion

It was not my intention to use higher-kinded type and type lambda in this project, but the solution
just seems to fit. The question is: can we achieve a similar requirement with a simpler design?
