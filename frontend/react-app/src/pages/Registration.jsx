export default function Registration() {
    
    return (
        <section id="registration">

            <div className="container">
                <div className="row">
                    <div className="col">
                        <h1>Register</h1>

                        <form className="registration-form d-block mx-auto">
                            <div className="form-group mb-3">
                                <label htmlFor="utorid" className="form-label">Utorid</label>
                                <input type="text" className="form-control" id="utorid" />
                            </div>
                            <div className="form-group mb-3">
                                <label htmlFor="name" className="form-label">Name</label>
                                <input type="text" className="form-control" id="name" />
                            </div>
                            <div className="form-group mb-3">
                                <label htmlFor="email" className="form-label">Email address</label>
                                <input type="email" className="form-control" id="email" aria-describedby="emailHelp" />
                                <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div>
                            </div>
                            <div className="form-group mb-3">
                                <label htmlFor="password" className="form-label">Password</label>
                                <input type="password" className="form-control" id="password" />
                            </div>
                            <button type="submit" className="btn btn-primary">Submit</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}