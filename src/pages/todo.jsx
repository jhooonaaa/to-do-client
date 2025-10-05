import React, { useEffect, useState } from "react";
import axios from "axios";
import AddModal from "../components/AddModal";
import { FaTrash, FaEdit, FaPlus, FaSave } from "react-icons/fa";

function Todo() {
  const [titles, setTitles] = useState([]);
  const [lists, setLists] = useState({});
  const [doneTitles, setDoneTitles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedTitle, setExpandedTitle] = useState(null);
  const [editingTitle, setEditingTitle] = useState({ id: null, title: "" });
  const [editingLists, setEditingLists] = useState(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const apiUrl = import.meta.env.VITE_ENDPOINT_URL;

  useEffect(() => {
    getTitles();
  }, []);

  const getTitles = async () => {
    try {
      const response = await axios.get(`${apiUrl}/get-titles`);
      const fetchedTitles = response.data.titles;

      // Prepare all list fetch promises for all titles at once
      const listPromises = fetchedTitles.map((title) =>
        axios.get(`${apiUrl}/get-lists/${title.id}`)
      );

      // Wait for all list fetches in parallel
      const listsResponses = await Promise.all(listPromises);

      // Now separate done and ongoing based on fetched lists
      const done = [];
      const ongoing = [];

      listsResponses.forEach((res, index) => {
        const title = fetchedTitles[index];
        const taskLists = res.data.lists;
        const allChecked = taskLists.length > 0 && taskLists.every(task => task.status);
        allChecked ? done.push(title) : ongoing.push(title);
      });

      setTitles(ongoing);
      setDoneTitles(done);
    } catch (error) {
      console.error("Error fetching titles:", error);
    }
  };


  const getLists = async (titleId, showCheckedOnly = false) => {
    try {
      const response = await axios.get(`${apiUrl}/get-lists/${titleId}`);
      let taskLists = response.data.lists;
      if (showCheckedOnly) taskLists = taskLists.filter(task => task.status);
      setLists((prevLists) => ({ ...prevLists, [titleId]: taskLists }));
    } catch (error) {
      console.error("Error fetching lists:", error);
    }
  };

  const handleCheckboxChange = async (listId, titleId) => {
    try {
      await axios.post(`${apiUrl}/update-status`, {
        title_id: titleId,
        list_id: listId,
        status: true,
      });
      await getTitles();
      setExpandedTitle(null);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleTitleClick = (titleId, isDoneSection = false) => {
    setExpandedTitle(expandedTitle === titleId ? null : titleId);
    getLists(titleId, isDoneSection);
  };

  const updateTitle = async () => {
    if (!editingTitle.title.trim()) return;
    try {
      await axios.post(`${apiUrl}/update-title`, {
        title_id: editingTitle.id,
        title: editingTitle.title,
      });
      setEditingTitle({ id: null, title: "" });
      setMessage("Title updated successfully!");
      setTimeout(() => setMessage(""), 3000);
      getTitles();
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };




  const deleteTitle = async (titleId) => {
    try {
      await axios.post(`${apiUrl}/delete-todo`, { title_id: titleId });
      setMessage("Deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
      getTitles();
    } catch (error) {
      console.error("Error deleting title:", error);
    }
  };

  // Enable edit mode for a specific title's list
  const startEditingLists = (titleId) => {
    setEditingLists({
      titleId,
      items: lists[titleId] ? [...lists[titleId]] : []
    });
  };

  // Handle input change in the edit form
  const handleEditChange = (index, newValue) => {
    setEditingLists((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index].list_desc = newValue;
      return { ...prev, items: updatedItems };
    });
  };

  // Add a new list item in edit mode
  const addNewListItem = () => {
    setEditingLists((prev) => ({
      ...prev,
      items: [...prev.items, { id: null, list_desc: "" }]
    }));
  };

  // Delete a specific list item in edit mode
  const handleDeleteListItem = async (listId, index) => {
    if (listId) {
      try {
        await axios.post(`${apiUrl}/delete-list`, { list_id: listId });

        // Immediately update state to remove the deleted item
        setLists((prevLists) => {
          const updatedLists = { ...prevLists };
          updatedLists[editingLists.titleId] = updatedLists[editingLists.titleId].filter((_, i) => i !== index);
          return updatedLists;
        });

      } catch (error) {
        console.error("Error deleting list:", error);
        return;
      }
    }

    // Also remove from the editing state
    setEditingLists((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };


  // Save all changes made in edit mode
  const saveEditedLists = async () => {
    try {
      const updatedItems = [...editingLists.items];

      for (let i = 0; i < updatedItems.length; i++) {
        let list = updatedItems[i];

        if (list.id) {
          // Update existing list
          await axios.post(`${apiUrl}/update-list`, {
            list_id: list.id,
            list_desc: list.list_desc,
          });
        } else {
          // Add new list item
          const response = await axios.post(`${apiUrl}/add-list`, {
            title_id: editingLists.titleId,
            list_desc: list.list_desc,
          });

          // Update the list item with the returned ID
          updatedItems[i] = { ...list, id: response.data.list_id };
        }
      }

      // Update the state immediately
      setLists((prevLists) => ({
        ...prevLists,
        [editingLists.titleId]: updatedItems,
      }));

      setMessage("List updated successfully!");
      setTimeout(() => setMessage(""), 3000);
      setEditingLists(null);
    } catch (error) {
      console.error("Error updating lists:", error);
    }
  };



  return (
  <div className="w-full min-h-screen flex flex-col items-center justify-center bg-pink-300 p-4 gap-4">
    <h2 className="text-2xl font-bold text-center text-pink-900 px-6 py-3 rounded-2xl bg-pink-100 border-2 border-pink-400 font-[Montserrat] shadow">
      🎀 To-Do List 🎀
    </h2>


    <div className="flex w-full max-w-4xl gap-4">
      {/* Ongoing Section */}
      <div className="flex-1 p-4 rounded-2xl shadow border-2 border-pink-400 bg-gradient-to-r from-pink-200 to-purple-300">
        <h3 className="text-center font-semibold mb-3 text-pink-800 text-lg">Ongoing</h3>
        {message && (
    <div className="text-green-700 text-sm font-bold font-[Montserrat] text-center mb-2">
      {message}
    </div>
  )}
        {titles.map((title) => (
          <div key={title.id} className="mb-2">
            {editingTitle.id === title.id ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={editingTitle.title}
                  className="p-1.5 border border-pink-400 rounded bg-pink-100 text-black placeholder-pink-500 text-sm"
                  onChange={(e) => setEditingTitle({ id: title.id, title: e.target.value })}
                />
                <div className="flex justify-end gap-1">
                  <button onClick={updateTitle} className="bg-purple-500 hover:bg-purple-700 text-white px-2 py-1 rounded text-sm">Save</button>
                  <button onClick={() => setEditingTitle({ id: null, title: "" })} className="bg-pink-500 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <button
                  className={`w-full p-1.5 rounded text-sm ${expandedTitle === title.id ? "bg-purple-500 text-white" : "bg-purple-400 hover:bg-purple-500 text-white"}`}
                  onClick={() => handleTitleClick(title.id)}
                >
                  {title.title}
                </button>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setEditingTitle({ id: title.id, title: title.title })}
                    className="bg-purple-200 text-blue-800 px-1.5 py-1 text-xs rounded hover:bg-purple-600 flex items-center justify-center"
                  >
                    <FaEdit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteTitle(title.id)}
                    className="bg-pink-200 text-red-800 px-1.5 py-1 text-xs rounded hover:bg-pink-600 flex items-center justify-center"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {expandedTitle === title.id && lists[title.id] && (
              <div className="mt-1 ml-3">
                {lists[title.id].map((list) => (
                  <div key={list.id} className="flex items-center gap-2 p-1.5 mb-1 bg-purple-200 rounded">
                    <input
                      type="checkbox"
                      checked={list.status}
                      onChange={() => handleCheckboxChange(list.id, title.id)}
                      disabled={list.status}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-sm text-gray-900 flex-1">{list.list_desc}</span>
                    <button
                      onClick={() => startEditingLists(title.id)}
                      className="bg-purple-300 text-blue-800 px-1 py-0.5 text-xs rounded hover:bg-purple-600"
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {editingLists && (
          <div className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-30 backdrop-blur-sm">
            <div className="p-4 bg-pink-300 rounded-xl shadow-2xl border-2 border-pink-400 w-[90%] max-w-sm">
              <h3 className="text-center font-semibold text-pink-800 text-base mb-3">🎀 Edit List 🎀</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {editingLists.items.map((list, index) => (
                  <div key={index} className="flex gap-1 items-center bg-pink-200 p-1.5 rounded">
                    <input
                      type="text"
                      value={list.list_desc}
                      onChange={(e) => handleEditChange(index, e.target.value)}
                      className="p-1 border border-pink-400 rounded w-full bg-pink-100 text-sm"
                    />
                    <button
                      onClick={() => handleDeleteListItem(list.id, index)}
                      className="bg-pink-100 hover:bg-pink-600 rounded p-1"
                    >
                      <FaTrash className="text-red-700 w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addNewListItem}
                className="bg-purple-500 hover:bg-purple-600 text-white w-full py-1.5 mt-2 rounded flex items-center justify-center text-sm"
              >
                <FaPlus className="mr-1 w-4 h-4" />
                Add Item
              </button>
              <div className="flex justify-between gap-2 mt-3">
                <button
                  onClick={saveEditedLists}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1"
                >
                  <FaSave className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setEditingLists(null)}
                  className="bg-pink-500 hover:bg-pink-700 text-white px-4 py-1.5 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Done Section */}
      <div className="flex-1 p-4 rounded-2xl shadow border-2 border-pink-400 bg-gradient-to-r from-purple-300 to-pink-200">
        <h3 className="text-center font-semibold mb-3 text-pink-800 text-lg">Done</h3>
        {doneTitles.map((title) => (
          <div key={title.id} className="mb-2">
            <button
              className="w-full p-1.5 bg-pink-400 hover:bg-pink-500 text-white rounded text-sm"
              onClick={() => handleTitleClick(title.id, true)}
            >
              {title.title}
            </button>
            {expandedTitle === title.id && lists[title.id] && (
              <div className="mt-1 ml-3">
                {lists[title.id].map((list) => (
                  <div key={list.id} className="flex items-center gap-2 p-1.5 mb-1 bg-pink-200 rounded">
                    <input type="checkbox" checked={list.status} readOnly className="w-4 h-4 accent-green-500" />
                    <span className="text-sm">{list.list_desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="flex justify-center mt-3">
      <button
        onClick={() => setShowModal(true)}
        className="bg-pink-600 hover:bg-pink-700 text-white w-10 h-10 rounded-full shadow-md text-xl flex items-center justify-center"
      >
        <FaPlus />
      </button>
    </div>

    {showModal && <AddModal hide={() => setShowModal(false)} onTaskAdded={getTitles} />}
  </div>
);


}

export default Todo;
