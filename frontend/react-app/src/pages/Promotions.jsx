import { useState, useEffect } from "react";
import { callBackend } from "../js/backend";
import { useUser } from "../components/UserContext/useUser.js";
import '../styles/Promotions.css';

export default function Promotions() {
    const { role } = useUser();
    const isManager = role === 'manager' || role === 'superuser';

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

    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [limit, setLimit] = useState(1);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editFromData, setEditFormData] = useState({
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

    async function fetchPromotions(currentPage = 1) {
        setLoading(true);
        setError(null);
        try {
            const response = await callBackend('GET', `/promotions?page=${currentPage}&limit=${limit}`, {});
            if (!response.ok) {
                setError("Failed to fetch promotions");
                setLoading(false);
                setPromotions([]);
                setCount(0);
                return;
            }
            console.log("Fetched promotions:", response.data.results);
            setPromotions(response.data.results || []);
            setCount(
                typeof response.data.count === 'number' ? response.data.count : (response.data.results || []).length
            )
        } catch (err) {
            setError("An error occurred while fetching promotions");
            setPromotions([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPromotions(page);
    }, [page, limit]);

    const totalPages = Math.max(1, Math.ceil(count / limit));
    console.log("Total pages: ", totalPages);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    }

    const buildPayload = (data, isCreate) => {
        const payload = {};

        if (!data.name || !data.description || !data.type || !data.startTime || !data.endTime) {
            setFormError("All fields are required");
            return null;
        }

        if (data.name.trim()) {
            payload.name = data.name.trim();
        }
        if (data.description.trim()) {
            payload.description = data.description.trim();
        }
        if (data.type.trim()) {
            payload.type = data.type.trim();
        }
        if (data.startTime.trim()) {
            payload.startTime = new Date(data.startTime).toISOString();
        }
        if (data.endTime.trim()) {
            payload.endTime = new Date(data.endTime).toISOString();
        }
        if (data.minSpending) {
            payload.minSpending = Number(data.minSpending);
        }
        if (data.rate) {
            payload.rate = Number(data.rate);
        }
        if (data.points) {
            payload.points = Number(data.points);
        }

        return payload;
    }

    const handleCreatePromotion = async (e) => {
        e.preventDefault();

        setFormError(null);
        setFormSuccess(null);

        const payload = buildPayload(formData, true);
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
            resetCreateForm();
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

    function resetCreateForm() {
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
        setFormError(null);
        setFormSuccess(null);
    }

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditFormData({
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
    }

    const handleStartEditPromotion = (promo) => {
        setEditFormData({
            id: promo.id,
            name: promo.name || '',
            description: promo.description || '',
            type: promo.type || 'automatic',
            startTime: promo.startTime ? new Date(promo.startTime).toISOString().slice(0, 16) : '',
            endTime: promo.endTime ? new Date(promo.endTime).toISOString().slice(0, 16) : '',
            minSpending: promo.minSpending || 0,
            rate: promo.rate || 0,
            points: promo.points || 0,
        });
        setIsEditModalOpen(true);
    }

    const handleUpdate = async (e) => {
        e.preventDefault();
        // Update promotion logic here
        if (!editFromData.id) {
            setFormError("Invalid promotion ID for update");
            return;
        }

        setFormError(null);
        setFormSuccess(null);

        const payload = buildPayload(editFromData, false);
        if (!payload) {
            return;
        }

        const response = await callBackend('PATCH', `/promotions/${editFromData.id}`, payload);
        if (!response.ok) {
            setFormError(response.data.message || "Failed to update promotion");
            return;
        }
        setFormSuccess("Promotion updated successfully");


        const updated = response.data;
        setPromotions((prevPromos) =>
            prevPromos.map((promo) =>
                promo.id === updated.id ? updated : promo
            )
        );
        closeEditModal();
    }

    const handleDelete = async (promo) => {
        if (!window.confirm(`Are you sure you want to delete promotion "${promo.name}"?`)) {
            return;
        }

        setFormError(null);
        setFormSuccess(null);

        try {
            const response = await callBackend('DELETE', `/promotions/${promo.id}`, {});
            if (!response.ok) {
                setFormError(response.data.message || "Failed to delete promotion");
                return;
            }
            setFormSuccess("Promotion deleted successfully");
            // Refresh promotions list
            if (page > 1 && promotions.length === 1) {
                const newPage = page - 1;
                setPage(newPage);
                fetchPromotions(newPage);
            } else {
                fetchPromotions(page);
            }
        } catch (error) {
            setFormError("An error occurred while deleting the promotion");
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

                        <div className="d-flex align-items-center gap-2 mb-2">
                            <label htmlFor="limitSelect">Promotions per page:</label>
                            <select
                                id="limitSelect"
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1); // Reset to first page when limit changes
                                }}
                            >
                                <option value={1}>1</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </select>
                        </div>

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
                                        {isManager && <th>Actions</th>}
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
                                            {isManager && (
                                                <td>
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleStartEditPromotion(promo)}>Edit</button>
                                                    <button className="btn btn-sm btn-danger ms-2" onClick={() => handleDelete(promo)}>Delete</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {totalPages > 1 && (
                            <div className="d-flex justify-content-center align-items-center my-3">
                                <button
                                    className="btn btn-secondary me-2"
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={page <= 1}
                                >
                                    Previous
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button
                                    className="btn btn-secondary ms-2"
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )


                        }

                        {formError && <div className="alert alert-danger">{formError}</div>}
                        {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

                        {isManager && (
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
                                        <input type="number" className="form-control w-100" id="minSpending" name="minSpending" min="0" step="1" value={formData.minSpending} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="rate" className="form-label">Rate (%):</label>
                                        <input type="number" className="form-control w-100" id="rate" name="rate" step="0.01" value={formData.rate} onChange={handleInputChange} />
                                    </div>

                                    <div className="form-group mb-3">
                                        <label htmlFor="points" className="form-label">Points:</label>
                                        <input type="number" className="form-control w-100" id="points" name="points" value={formData.points} onChange={handleInputChange} />
                                    </div>
                                    <div className="d-flex gap-2 mt-2">
                                        <button type="submit" className="btn btn-primary mt-3">Create Promotion</button>
                                        <button type="button" className="btn btn-secondary mt-3" onClick={resetCreateForm}>Reset</button>
                                    </div>
                                </form>
                            </div>
                        )}


                        {isManager && isEditModalOpen && (
                            <div className="modal" tabindex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <div className="modal-dialog">
                                    <div className="modal-content">
                                        <div className="modal-header">
                                            <h2>Edit Promotion</h2>
                                        </div>
                                        <div className="modal-body">
                                            <form onSubmit={handleUpdate} className="d-flex flex-column w-100">
                                                <div className="form-group mb-3">
                                                    <label htmlFor="editPromoName" className="form-label">Promotion Name:</label>
                                                    <input type="text" className="form-control" id="editPromoName" name="name" value={editFromData.name} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editDescription" className="form-label">Description:</label>
                                                    <input type="text" className="form-control" id="editDescription" name="description" value={editFromData.description} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editPromoType" className="form-label">Type:</label>
                                                    <select className="form-control" id="editPromoType" name="type" value={editFromData.type} onChange={handleEditInputChange}>
                                                        <option value="automatic">Automatic</option>
                                                        <option value="one-time">One Time</option>
                                                    </select>
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editStartTime" className="form-label">Start Time:</label>
                                                    <input type="datetime-local" className="form-control" id="editStartTime" name="startTime" value={editFromData.startTime} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editEndTime" className="form-label">End Time:</label>
                                                    <input type="datetime-local" className="form-control" id="editEndTime" name="endTime" value={editFromData.endTime} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editMinSpending" className="form-label">Minimum Spending:</label>
                                                    <input type="number" className="form-control w-100" id="editMinSpending" name="minSpending" step="1" min="0" value={editFromData.minSpending} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editRate" className="form-label">Rate (%):</label>
                                                    <input type="number" className="form-control w-100" id="editRate" name="rate" step="0.01" value={editFromData.rate} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="form-group mb-3">
                                                    <label htmlFor="editPoints" className="form-label">Points:</label>
                                                    <input type="number" className="form-control w-100" id="editPoints" name="points" value={editFromData.points} onChange={handleEditInputChange} />
                                                </div>

                                                <div className="modal-footer">
                                                    <button type="button" className="btn btn-secondary me-2" onClick={closeEditModal}>Cancel</button>
                                                    <button type="submit" className="btn btn-primary">Save Changes</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
