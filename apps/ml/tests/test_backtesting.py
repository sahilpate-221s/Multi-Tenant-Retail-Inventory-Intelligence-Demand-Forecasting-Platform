import math
import pytest
from app.forecasting.backtesting import backtest
from app.forecasting.baselines import moving_average, exponential_smoothing


class TestBacktest:
    def test_perfect_forecast_yields_zero_error(self):
        # A "forecast function" that always predicts the true next value
        # exactly (only possible in this test) should yield zero error.
        history = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]

        def perfect_forecast(training_data):
            return 10  # we know the series is constant at 10

        result = backtest(history, perfect_forecast, min_history_size=5)
        assert result.mae == 0.0
        assert result.rmse == 0.0
        assert result.wape == 0.0

    def test_constant_series_moving_average_is_near_perfect(self):
        history = [5.0] * 15
        result = backtest(history, lambda h: moving_average(h, window=7), min_history_size=7)
        assert result.mae == pytest.approx(0.0, abs=0.001)

    def test_runs_the_expected_number_of_trials(self):
        history = list(range(20))  # 20 points
        result = backtest(history, lambda h: moving_average(h, window=5), min_history_size=5)
        # min_history_size=5, len=20 -> trials for i in range(5, 20) = 15 trials
        assert result.num_trials == 15

    def test_throws_when_not_enough_history(self):
        with pytest.raises(ValueError):
            backtest([1, 2, 3], lambda h: 1, min_history_size=7)

    def test_wape_is_nan_for_all_zero_actuals(self):
        history = [0.0] * 10
        result = backtest(history, lambda h: 0, min_history_size=5)
        assert math.isnan(result.wape)

    def test_a_deliberately_bad_forecast_scores_worse_than_a_good_one(self):
        history = [10.0] * 15
        good_result = backtest(history, lambda h: moving_average(h, window=7), min_history_size=7)
        bad_result = backtest(history, lambda h: 0, min_history_size=7)  # always predicts zero
        assert bad_result.mae > good_result.mae
        assert bad_result.rmse > good_result.rmse

    def test_rmse_penalizes_large_errors_more_than_mae(self):
        # Forecast function with one huge miss and several small ones.
        # RMSE should be pulled up disproportionately relative to MAE
        # because it squares errors before averaging.
        history = [10, 10, 10, 10, 10, 10, 10, 10, 100]  # spike at the end
        result = backtest(history, lambda h: moving_average(h, window=7), min_history_size=7)
        # RMSE >= MAE is mathematically guaranteed; for data with a spike,
        # the gap should be meaningfully larger than for constant data.
        assert result.rmse > result.mae

    def test_compares_two_real_baselines_against_each_other(self):
        # A trending series: exponential smoothing (alpha=0.5, reacts fast)
        # should outperform a 7-day moving average (slow to react) on MAE.
        history = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        sma_result = backtest(history, lambda h: moving_average(h, window=7), min_history_size=7)
        ses_result = backtest(
            history, lambda h: exponential_smoothing(h, alpha=0.5), min_history_size=7
        )
        assert ses_result.mae < sma_result.mae