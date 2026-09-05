import pytest
from app.forecasting.baselines import moving_average, weighted_moving_average, exponential_smoothing


class TestMovingAverage:
    def test_computes_correct_average(self):
        assert moving_average([10, 10, 10, 10], window=4) == 10.0

    def test_uses_only_the_window(self):
        # window=2 should only look at the last 2 values: [20, 30] -> avg 25
        assert moving_average([100, 100, 20, 30], window=2) == 25.0

    def test_handles_fewer_observations_than_window(self):
        assert moving_average([5, 15], window=7) == 10.0

    def test_handles_empty_history(self):
        assert moving_average([], window=7) == 0.0

    def test_throws_on_invalid_window(self):
        with pytest.raises(ValueError):
            moving_average([1, 2, 3], window=0)


class TestWeightedMovingAverage:
    def test_weights_recent_values_more_heavily(self):
        # [0, 0, 0, 100] with weights [1,2,3,4] -> (0+0+0+400)/10 = 40
        result = weighted_moving_average([0, 0, 0, 100], window=4)
        assert result == 40.0

    def test_differs_from_simple_average_when_trend_exists(self):
        history = [10, 20, 30, 40]
        sma = moving_average(history, window=4)
        wma = weighted_moving_average(history, window=4)
        # WMA should be pulled higher than SMA since recent (higher) values are weighted more
        assert wma > sma

    def test_equals_simple_average_for_constant_values(self):
        history = [15, 15, 15, 15]
        assert weighted_moving_average(history, window=4) == 15.0

    def test_handles_empty_history(self):
        assert weighted_moving_average([], window=7) == 0.0


class TestExponentialSmoothing:
    def test_constant_history_returns_that_constant(self):
        assert exponential_smoothing([7, 7, 7, 7], alpha=0.3) == 7.0

    def test_higher_alpha_reacts_faster_to_a_recent_spike(self):
        history = [10, 10, 10, 50]  # sudden spike at the end
        low_alpha = exponential_smoothing(history, alpha=0.1)
        high_alpha = exponential_smoothing(history, alpha=0.9)
        # Higher alpha should be pulled much closer to the recent spike
        assert high_alpha > low_alpha

    def test_handles_empty_history(self):
        assert exponential_smoothing([], alpha=0.3) == 0.0

    def test_throws_on_invalid_alpha(self):
        with pytest.raises(ValueError):
            exponential_smoothing([1, 2, 3], alpha=0)
        with pytest.raises(ValueError):
            exponential_smoothing([1, 2, 3], alpha=1.5)

    def test_single_observation_returns_that_value(self):
        assert exponential_smoothing([42], alpha=0.5) == 42.0