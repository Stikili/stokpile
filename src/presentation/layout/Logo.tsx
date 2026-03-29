interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Stacked Coins with People Icon */}
      <div className="relative">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          {/* Bottom Coin */}
          <ellipse
            cx="20"
            cy="30"
            rx="14"
            ry="4"
            className="fill-current opacity-20"
          />
          <ellipse
            cx="20"
            cy="30"
            rx="14"
            ry="4"
            className="stroke-current"
            strokeWidth="1.5"
          />
          
          {/* Middle Coin */}
          <ellipse
            cx="20"
            cy="22"
            rx="13"
            ry="3.5"
            className="fill-current opacity-30"
          />
          <ellipse
            cx="20"
            cy="22"
            rx="13"
            ry="3.5"
            className="stroke-current"
            strokeWidth="1.5"
          />
          
          {/* Top Coin */}
          <ellipse
            cx="20"
            cy="15"
            rx="12"
            ry="3"
            className="fill-current opacity-40"
          />
          <ellipse
            cx="20"
            cy="15"
            rx="12"
            ry="3"
            className="stroke-current"
            strokeWidth="1.5"
          />
          
          {/* Coin Stack Sides */}
          <line x1="6" y1="30" x2="6" y2="15" className="stroke-current opacity-30" strokeWidth="1" />
          <line x1="34" y1="30" x2="34" y2="15" className="stroke-current opacity-30" strokeWidth="1" />
          
          {/* Dollar Sign on Top Coin */}
          <text
            x="20"
            y="17.5"
            className="fill-primary"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
          >
            $
          </text>
          
          {/* Group of People (3 figures) above coins */}
          <g transform="translate(20, 5)">
            {/* Left Person */}
            <circle cx="-5" cy="0" r="2.5" className="fill-primary" />
            <path
              d="M -7.5 3 Q -5 2.5 -2.5 3"
              className="stroke-primary fill-primary"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            
            {/* Center Person (slightly larger) */}
            <circle cx="0" cy="-1" r="2.8" className="fill-primary" />
            <path
              d="M -3 2.5 Q 0 2 3 2.5"
              className="stroke-primary fill-primary"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            
            {/* Right Person */}
            <circle cx="5" cy="0" r="2.5" className="fill-primary" />
            <path
              d="M 2.5 3 Q 5 2.5 7.5 3"
              className="stroke-primary fill-primary"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
          
          {/* Growth Arrow Accent */}
          <g className="opacity-60">
            <line x1="33" y1="12" x2="37" y2="8" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
            <polyline points="35,8 37,8 37,10" className="stroke-primary fill-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      
      {/* App Name */}
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-2xl leading-none">Stokpile</h1>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">
            Transparent group savings
          </p>
        </div>
      )}
    </div>
  );
}
