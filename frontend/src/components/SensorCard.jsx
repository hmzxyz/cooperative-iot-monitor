function SensorCard({ label, value, unit, description }) {
  return (
    <div className="sensor-card">
      <div className="sensor-card__header">
        <span>{label}</span>
        <span className="sensor-card__unit">{unit}</span>
      </div>
      <div className="sensor-card__value">{value}</div>
      {description ? <div className="sensor-card__description">{description}</div> : null}
    </div>
  );
}

export default SensorCard;
