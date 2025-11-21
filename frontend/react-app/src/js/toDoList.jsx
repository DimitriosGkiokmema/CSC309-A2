import "../styles/App.css";
import { useState } from "react"
import NewTodo from "../components/NewTodo";
import TodoItem from "../components/TodoItem";

// You can use this to seed your TODO list
const seed = [
    { id: 0, text: "Submit assignment 2", completed: false },
    { id: 1, text: "Reschedule the dentist appointment", completed: false },
    { id: 2, text: "Prepare for CSC309 exam", completed: false },
    { id: 3, text: "Find term project partner", completed: true },
    { id: 4, text: "Learn React Hooks", completed: false },
];

function TODOList() {
    // The App component serves as the main entry point for our application. At the very top, the App component shows the list title: "My ToDos". Below the list title, App component hosts a NewTodo component and a list of TodoItem components.
    const [todos, setTodos] = useState(seed)
    
    function addTodo(text) {
        setTodos(prev => [
            ...prev,
            {
                id: prev.length,
                text,
                completed: false
            }
        ]);
    }

    function handleToggle(id) {
        console.log("toggle")
        setTodos(prev =>
            prev.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        )
    }

    function handleDelete(id) {
        console.log("delete")
        console.log(id)
        setTodos(prev => 
            prev.filter(t => t.id !== id)
        )
        console.log(todos)
    }

    return (
    <div className="app">
        <h1>My ToDos</h1>

        <NewTodo onAdd={addTodo}/>

        {todos.map((item) => (
            <TodoItem 
                id={item.id}
                item={item.text}
                done={item.completed}
                onToggle={handleToggle}
                onDelete={handleDelete}
            />
        ))}
    </div>);
}

export default TODOList;