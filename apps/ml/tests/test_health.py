def is_healthy(status: str) -> bool:
    return status == "ok"


def test_is_healthy_returns_true_for_ok():
    assert is_healthy("ok") is True


def test_is_healthy_returns_false_for_other():
    assert is_healthy("down") is False