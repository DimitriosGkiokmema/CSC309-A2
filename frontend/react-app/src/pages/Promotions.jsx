import { useState, useEffect } from "react";
import { callBackend } from "../js/backend";

export default function Promotions({ role }) {
    console.log("Promotions component received role:", role);
    const isManagerOrHigher = role === 'manager' || role === 'superuser';
    console.log("Is user manager or higher?", isManagerOrHigher);

    const [promotions, setPromotions] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        type: 'automatic',
        startTime: '',
        endTime: '',
        minSpending: 0,
        rate: 0,
        points: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [formSuccess, setFormSuccess] = useState(null);

    useEffect(() => {
        async function fetchPromotions() {
            setLoading(true);
            setError(null);
            try {
                const response = await callBackend('GET', '/promotions', {});
                if (!response.ok) {
                    setError("Failed to fetch promotions");
                    setLoading(false);
                    setPromotions([]);
                    return;
                }
                setPromotions(response.data.results || []);
            } catch (err) {
                setError("An error occurred while fetching promotions");
            } finally {
                setLoading(false);
            }
        }

        fetchPromotions();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    }

    const buildPayload = () => {
        const payload = {};

        if(!formData.name || !formData.description || !formData.type || !formData.startTime || !formData.endTime) {
            setFormError("All fields are required");
            return null;
        }

        if(formData.name.trim()) {
            payload.name = formData.name.trim();
        }
        if(formData.description.trim()) {
            payload.description = formData.description.trim();
        }
        if(formData.type.trim()) {
            payload.type = formData.type.trim();
        }
        if(formData.startTime.trim()) {
            payload.startTime = new Date(formData.startTime).toISOString();
        }
        if(formData.endTime.trim()) {
            payload.endTime = new Date(formData.endTime).toISOString();
        }
        if(formData.minSpending) {
            payload.minSpending = Number(formData.minSpending);
        }
        if(formData.rate) {
            payload.rate = Number(formData.rate);
        }
        if(formData.points) {
            payload.points = Number(formData.points);
        }

        return payload;
    }

    const handleCreatePromotion = async (e) => {
        e.preventDefault();

        setFormError(null);
        setFormSuccess(null);

        const payload = buildPayload();
        if (!payload) {
            return;
        }

        try {
            const response = await callBackend('POST', '/promotions', payload);
            if (!response.ok) {
                setFormError(response.data.message || "Failed to create promotion");
                return;
            }
            setFormSuccess("Promotion created successfully");
            setFormData({
                id: null,
                name: '',
                description: '',
                type: 'automatic',
                startTime: '',
                endTime: '',
                minSpending: 0,
                rate: 0,
                points: 0,
            });
            // Refresh promotions list
            const refreshedPromotions = await callBackend('GET', '/promotions', {});
            if (refreshedPromotions.ok) {
                setPromotions(refreshedPromotions.data.results || []);
            }
        } catch (error) {
            setFormError("An error occurred while creating the promotion");
        }
        
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return "N/A";
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString();
        } catch (error) {
            return dateTimeStr;
        }
    }

    if (loading) {
        return <div>Loading promotions...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div id="promotions">
            <div className="container">
                <div className="row">
                    <div className="col">
                        <h1>Promotions Overview</h1>

                        {!loading && promotions.length > 0 && (
                            <table className="table table-striped table-bordered">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Start time</th>
                                        <th>End time</th>
                                        <th>Min Spending</th>
                                        <th>Rate</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promotions.map((promo) => (
                                        <tr key={promo.id}>
                                            <td>{promo.id}</td>
                                            <td>{promo.name}</td>
                                            <td>{promo.type}</td>
                                            <td>{formatDateTime(promo.startTime)}</td>
                                            <td>{formatDateTime(promo.endTime)}</td>
                                            <td>{promo.minSpending}</td>
                                            <td>{promo.rate}</td>
                                            <td>{promo.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {isManagerOrHigher && (
                            <div className="mt-4">
                                <h2 className="text-center">Create Promotion</h2>
                                <form className="d-block mx-auto" onSubmit={handleCreatePromotion}>
                                    <div className="form-group mb-3">
                                        <label htmlFor="promoName" className="form-label">Promotion Name:</label>
                                        <input type="text" className="form-control" id="promoName" name="name" value={formData.name} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="description" className="form-label">Description:</label>
                                        <input type="text" className="form-control" id="description" name="description" value={formData.description} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="promoType" className="form-label">Type:</label>
                                        <select className="form-control" id="promoType" name="type">
                                            <option value="automatic">Automatic</option>
                                            <option value="one-time">One Time</option>
                                        </select>
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="startTime" className="form-label">Start Time:</label>
                                        <input type="datetime-local" className="form-control" id="startTime" name="startTime" value={formData.startTime} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="endTime" className="form-label">End Time:</label>
                                        <input type="datetime-local" className="form-control" id="endTime" name="endTime" value={formData.endTime} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="minSpending" className="form-label">Minimum Spending:</label>
                                        <input type="number" className="form-control" id="minSpending" name="minSpending" min="0" value={formData.minSpending} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="rate" className="form-label">Rate (%):</label>
                                        <input type="number" className="form-control" id="rate" name="rate" step="0.01" value={formData.rate} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="points" className="form-label">Points:</label>
                                        <input type="number" className="form-control" id="points" name="points" value={formData.points} onChange={handleInputChange} />
                                    </div>

                                    <button type="submit" className="btn btn-primary mt-3">Create Promotion</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}