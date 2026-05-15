import { useEffect, useRef, useState } from 'react';

function SensorCard({ label, value, unit }) {
  const previousValueRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (previousValueRef.current !== value) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 450);
      previousValueRef.current = value;
      return () => clearTimeout(id);
    }
    previousValueRef.current = value;
    return undefined;
  }, [value]);

  return (
    <div className={`sensor-card${flash ? ' sensor-card--updated' : ''}`}>
      <div className="sensor-card__header">
        <span>{label}</span>
        <span className="sensor-card__unit">{unit}</span>
      </div>
      <div className="sensor-card__value">{value}</div>
    </div>
  );
}

export default SensorCard;
