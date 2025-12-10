import { useEffect, useState } from "react";
import "./style.css"

export default function TopNotification({ message, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onDone(); // tell parent to remove this message
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div className="notifContainer">
        <div
        className={`notif  ${
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 9999 }}
        >
        {message}
        </div>
    </div>
  );
}
