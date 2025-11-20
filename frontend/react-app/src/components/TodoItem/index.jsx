import "./style.css";
import trashPic from "../../assets/trash.webp";

function TodoItem({ id, item, done, onToggle, onDelete }) {
    function toggle() {
        onToggle(id);
    }

    function deleteItem() {
        onDelete(id);
    }

    return (
    <div className="todo-item row">
        <input
            type="checkbox"
            checked={done}
            onChange={toggle}
        />
        <span className={done ? "completed" : ""}>
        {item}
        </span>
        <a onClick={deleteItem}>
            <img src={trashPic} alt="Trash" />
        </a>
    </div>
  )
}

export default TodoItem;