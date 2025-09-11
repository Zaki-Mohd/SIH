import React, { useEffect, useState } from "react";
import "./landing.css";

const Landing: React.FC<{ onEnter?: () => void }> = ({ onEnter }) => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Show overlay after a delay for dramatic effect
    const timer = setTimeout(() => setShowOverlay(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-container">
      {/* Animated Metro Tunnel */}
      <div className="tunnel"></div>
      
      {/* Parallax Rails */}
      <div className="rails-layer-1"></div>
      <div className="rails-layer-2"></div>
      <div className="rails-layer-3"></div>

      {/* Sparks Effect */}
      <div className="sparks">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`spark spark-${i + 1}`}></div>
        ))}
      </div>

      {/* Train with Motion Blur */}
      <div className="train">
        <div className="train-body">
          <div className="windows">
            <div></div><div></div><div></div>
          </div>
          <div className="headlight"></div>
          <div className="motion-blur"></div>
        </div>
      </div>

      {/* Flying Documents Confetti */}
      <div className="papers">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className={`paper paper-${i + 1}`}>
            <div className="paper-content">
              <div className="paper-line"></div>
              <div className="paper-line"></div>
              <div className="paper-line"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Neon Sparks Title */}
      {showOverlay && (
        <div className="landing-overlay">
          <h1 className="neon-text flicker">🚇 Saarthi Metro AI</h1>
          <p className="subtitle">Knowledge in Motion • Powered by Docs</p>
          <p className="team-signature laser-engrave">By Team A2Z ⚡</p>
          {onEnter && (
            <button className="enter-btn" onClick={onEnter}>
              Enter Dashboard
            </button>
          )}
        </div>
      )}

      {/* Audio Hook (Optional) */}
      {/* <audio autoPlay loop>
        <source src="/train-sound.mp3" type="audio/mpeg" />
      </audio> */}
    </div>
  );
};

export default Landing;