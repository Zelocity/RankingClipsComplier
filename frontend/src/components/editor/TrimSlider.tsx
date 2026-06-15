type TrimSliderProps = {
  duration: number;
  startTime: number;
  endTime: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
};

function TrimSlider({
  duration,
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
}: TrimSliderProps) {
  const max = duration || 60;

  return (
    <div className="trim-slider">
      <div className="trim-slider-values">
        <span>Start: {startTime.toFixed(1)}s</span>
        <span>End: {endTime.toFixed(1)}s</span>
      </div>

      <div className="range-wrapper">
        <input
          type="range"
          min="0"
          max={max}
          step="0.1"
          value={startTime}
          onChange={(event) => onChangeStart(Number(event.target.value))}
          className="range-input range-start"
        />

        <input
          type="range"
          min="0"
          max={max}
          step="0.1"
          value={endTime}
          onChange={(event) => onChangeEnd(Number(event.target.value))}
          className="range-input range-end"
        />
      </div>

      <p>Selected segment: {(endTime - startTime).toFixed(1)}s</p>
    </div>
  );
}

export default TrimSlider;