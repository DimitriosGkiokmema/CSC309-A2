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
        <div className="homepage">

            {/* HERO SECTION */}
            <section className="hero">
                <div className="hero-content">
                    <h1>Varsity Mart</h1>
                    <p>
                        UofT’s official on-campus grocery and essentials retailer.
                        Designed to support students, staff, and faculty with a streamlined
                        rewards and redemption system powered by our cashier portal.
                    </p>
                </div>
            </section>

            {/* HIGHLIGHTS SECTION */}
            <section className="highlights">
                <h2>What We Offer</h2>

                <div className="highlight-grid">
                    <div className="highlight-card">
                        <h3>Student-Focused Service</h3>
                        <p>
                        Designed around the daily needs of UofT students. Quick checkout,
                        transparent rewards, and reliable redemption workflows.
                        </p>
                    </div>

                    <div className="highlight-card">
                        <h3>Role-Based Access</h3>
                        <p>
                        Our system supports cashiers, managers, regular customers,
                        and superusers with clean access control.
                        </p>
                    </div>

                    <div className="highlight-card">
                        <h3>Inventory & Rewards</h3>
                        <p>
                        Fully integrated backend enabling item creation, redemption
                        processing, and role-specific dashboard actions.
                        </p>
                    </div>
                </div>
            </section>

            {/* LOCATION SECTION */}
            <div className="row storeContainer">
                <div className="col-8 storeLocation">
                    <div className="col-4 storeInfo">
                        <h1>Our Location</h1>
                        <p>
                            309 St George St <br></br>
                            Toronto, Ontario
                        </p>
                        <img className="martPic" src="/assets/Varsity_Mart.png"></img>
                    </div>

                    <div className="col-6" id="map"></div>
                </div>
            </div>
        </div>
    );
}
