import { useState } from "react";
import "./style.css"

export default function UpdatePassword({onClose, onSubmit}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const isValid = (() => {
    if (newPassword.length < 8 || newPassword.length > 20) return false;
    if (!/[A-Z]/.test(newPassword)) return false;
    if (!/[a-z]/.test(newPassword)) return false;
    if (!/[0-9]/.test(newPassword)) return false;
    if (!/[^A-Za-z0-9]/.test(newPassword)) return false;
    return true;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("old: ", oldPassword)
    // console.log("new: ", newPassword)

    onSubmit(oldPassword, newPassword);
    closeWindow();
  };

  function closeWindow() {
    onClose();
  }

  return (
    <div className="popup-overlay">
      <div className="popup-window">
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="closeWindow">
          <i class="fa-solid fa-x" onClick={closeWindow}></i>
        </div>

        <div>
          <label className="block">Current Password</label>
          <input
            type="password"
            className="input-field"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block">New Password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <ul className="requirements-list">
            <li>
              {newPassword.length >= 8 && newPassword.length <= 20 ? (
                <i className="fa-solid fa-square-check"></i>
              ) : (
                <i className="fa-solid fa-square-xmark"></i>
              )} 8–20 characters
            </li>
            <li>
              {/[A-Z]/.test(newPassword) ? (
                <i className="fa-solid fa-square-check"></i>
              ) : (
                <i className="fa-solid fa-square-xmark"></i>
              )} At least one uppercase
            </li>
            <li>
              {/[a-z]/.test(newPassword) ? (
                <i className="fa-solid fa-square-check"></i>
              ) : (
                <i className="fa-solid fa-square-xmark"></i>
              )} At least one lowercase
            </li>
            <li>
              {/[0-9]/.test(newPassword) ? (
                <i className="fa-solid fa-square-check"></i>
              ) : (
                <i className="fa-solid fa-square-xmark"></i>
              )} At least one number
            </li>
            <li>
              {/[^A-Za-z0-9]/.test(newPassword) ? (
                <i className="fa-solid fa-square-check"></i>
              ) : (
                <i className="fa-solid fa-square-xmark"></i>
              )} At least one special character
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className={`rounded text-white ${
            isValid ? 'submit-enabled' : 'submit-disabled'
          }`}
        >
          Update Password
        </button>
      </form>
      </div>
    </div>
  );
}
