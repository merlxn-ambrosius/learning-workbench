"""Forward engine is supplied. Implement grad, using Python's standard library."""
import math
from dataclasses import dataclass


@dataclass(eq=False, frozen=True)
class Value:
    data: float
    op: str = "input"
    parents: tuple = ()

    def __add__(self, other):
        return Value(self.data + other.data, "add", (self, other))

    def __mul__(self, other):
        return Value(self.data * other.data, "mul", (self, other))

    def tanh(self):
        return Value(math.tanh(self.data), "tanh", (self,))


def grad(output, inputs):
    """Return a list of d(output)/d(input) for the requested input nodes, in order.

    Only finite values and the supplied operations occur. Inputs are leaf nodes.
    Repeated queries are allowed; unrelated inputs have derivative zero.
    Calls must be independent. Do not perturb or replay the forward computation.
    """
    raise NotImplementedError("Implement grad in engine.py")
