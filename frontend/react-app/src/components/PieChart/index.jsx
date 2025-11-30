import { useEffect, useRef } from "react";
import { createPieChart } from "../../js/piechart";

export default function EventChart({ title, started, ended }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) {
            console.log("ref is null – component didn’t mount");
            return;
        }

        const chart = createPieChart({
            title,
            started,
            ended
        });

        ref.current.innerHTML = "";      // clear previous render
        ref.current.appendChild(chart);  // add the SVG
}, [title, started, ended]);

    return (
        <div ref={ref}></div>
    );
}
