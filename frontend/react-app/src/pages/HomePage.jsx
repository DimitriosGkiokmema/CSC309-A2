import { useEffect } from "react";
import leaflet from "../js/leaflet.js";

export default function HomePage() {
    useEffect(() => {
        // Runs AFTER the component renders
        // The #map element now EXISTS in the DOM
        if (!L.DomUtil.get("map")._leaflet_id) {
            leaflet();
        }

    }, []);

    return (
        <div className="row storeContainer">
        <div className="col-8 storeLocation">
            <div className="col-4 storeInfo">
                <h1>Our Location</h1>
                <p>
                    309 St George St <br></br>
                    Toronto, Ontario
                </p>
                <img className="martPic" src="../src/assets/Varsity_Mart.png"></img>
            </div>

            <div className="col-6" id="map"></div>
        </div>
    </div>
    );
}