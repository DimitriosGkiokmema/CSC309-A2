// use callbackend to register a new user
import { useState } from "react";
import { callBackend } from "../js/backend";

export default function Registration() {
    const [utorid, setUtorid] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError("");
        setSuccess("");

        if (!utorid || !name || !email) {
            setError("All fields are required");
            setLoading(false);
            return;
        }

        if (!email.endsWith("@mail.utoronto.ca")) {
            setError("Email must be a valid University of Toronto email address");
            setLoading(false);
            return;
        }

        const token = sessionStorage.getItem("token");
        if (!token) {
            setError("You must be logged in to register");
            setLoading(false);
            return;
        }

        try {
            const response = await callBackend('POST', '/users', { utorid, name, email });
            if (!response.ok) {
                setError(response.data.message || "Failed to register");
                setLoading(false);
                return;
            } else {
                setSuccess("Registration successful");
            }
        } catch (error) {
            setError("An unexpected error occurred");
        }

        finally {
            setLoading(false);
            setUtorid("");
            setName("");
            setEmail("");
        }
    }

    return (
        <section id="registration" className="py-4">
            <div className="container">
                <div className="row">
                    <div className="col">
                        <h1 className="mt-2">Register User</h1>

                        {error && <div className="alert alert-danger">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}

                        <form className="registration-form d-block mx-auto" onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label htmlFor="utorid" className="form-label">Utorid</label>
                                <input type="text" className="form-control" id="utorid" name="utorid" value={utorid} onChange={e => setUtorid(e.target.value)} />
                            </div>
                            <div className="form-group mb-3">
                                <label htmlFor="name" className="form-label">Name</label>
                                <input type="text" className="form-control" id="name" name="name" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="form-group mb-3">
                                <label htmlFor="email" className="form-label">Email address</label>
                                <input type="email" className="form-control" id="email" name="email" value={email} onChange={e => setEmail(e.target.value)} aria-describedby="emailHelp" />
                                <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? "Registering..." : "Register"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}