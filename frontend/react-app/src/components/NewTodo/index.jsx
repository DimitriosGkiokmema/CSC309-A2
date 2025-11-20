import "./style.css";
import { useState } from "react"

export default function NewTodo({ onAdd }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;

    onAdd(text)
    setText("") // clear field
  }

  return (
    <div className="new-todo row">
      <input
        placeholder="Enter a new task"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button onClick={handleSubmit}>+</button>
    </div>
  )
}
