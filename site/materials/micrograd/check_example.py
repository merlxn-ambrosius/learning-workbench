"""A public example for engine.py. Run: python3 check_example.py."""
import math
from engine import Value, grad


def main():
    x = Value(2.0)
    c = Value(2.0)
    shared, fixed = x * x, x * c
    print("Forward values:", shared.data, fixed.data)
    assert shared.data == fixed.data == 4.0

    try:
        results = [grad(shared, [x]), grad(fixed, [x])]
    except NotImplementedError:
        print("Forward check passed. Implement grad(output, inputs) in engine.py, then run again.")
        return 2

    for result, expected in zip(results, [4.0, 2.0]):
        assert isinstance(result, list) and len(result) == 1, result
        assert math.isclose(result[0], expected, abs_tol=1e-8), (result, expected)
    print("Both example gradients match. Try a new expression and an independent check.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
