import { Star } from 'lucide-react';
import React from 'react';

export default function StarRating({ value, onChange, size = 32, readOnly = false }) {
  // value can be a float like 4.3 for readOnly, but onChange deals with integers
  
  const [hoverValue, setHoverValue] = React.useState(0);

  const handleMouseMove = (index) => {
    if (readOnly) return;
    setHoverValue(index);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(0);
  };

  const handleClick = (index) => {
    if (readOnly) return;
    if (onChange) onChange(index);
  };

  return (
    <div className="flex items-center gap-1.5" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        let fillPct = 0;
        const compareVal = hoverValue || value;

        if (compareVal >= starIndex) {
          fillPct = 100;
        } else if (compareVal > starIndex - 1) {
          fillPct = (compareVal - (starIndex - 1)) * 100;
        }

        return (
          <div
            key={starIndex}
            className={`relative ${readOnly ? '' : 'cursor-pointer transition-transform hover:scale-110'}`}
            onMouseEnter={() => handleMouseMove(starIndex)}
            onClick={() => handleClick(starIndex)}
            style={{ width: size, height: size }}
          >
            {/* Background Outline Star */}
            <Star
              size={size}
              className="absolute inset-0 text-gray-300 stroke-[1.5]"
            />
            {/* Foreground Filled Star (Cliped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPct}%` }}
            >
              <Star
                size={size}
                className="text-teal-400 fill-[#5EC4C4] stroke-[#5EC4C4]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
