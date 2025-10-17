import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface UserType {
  id: number;
  username: string;
}

interface MessageType {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  senderUsername: string;
  createdAt: string;
}

let socket: Socket;

export default function App() {
  const [auth, setAuth] = useState<{ id: number; username: string } | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [notifications, setNotifications] = useState<Record<number, number>>({});
  const [lastmessage, setLastmessage] = useState<MessageType[]>([]);
  // search user
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserType[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    if (!id || !username) {
      navigate("/login");
    } else {
      setAuth({ id: Number(id), username });
    }
  }, [navigate]);

  useEffect(() => {
    if (!auth) return;

    // Fetch all users (exclude self)
    axios.get("http://localhost:5000/api/users").then((res) => {
      setUsers(res.data.filter((u: UserType) => u.id !== auth.id));
    });

    // Setup socket only once
    if (!socket) socket = io("http://localhost:5000");

    // Register current userId to server for notifications
    socket.emit("register", auth.id);

    // Listen to newMessage events
    socket.on("newMessage", (msg: MessageType) => {
      if (msg.receiverId === auth.id && msg.senderId !== auth.id) {
        toast.info(`💬 New message from ${msg.senderUsername}`);

        // Increment notification count for that sender
        setNotifications((prev) => ({
          ...prev,
          // array like 3:1, 5:2 (userId:count), the first is msg.senderId
          [msg.senderId]: prev[msg.senderId] ? prev[msg.senderId] + 1 : 1,
          // pre[msg.senderId] means finding the userId in the previous state
        }));
      }
    });

    return () => {
      socket.off("newMessage");
    };
  }, [auth]);

  // fetch the last message for each user
  useEffect(() => {
    if (!auth) return;
    const fetchLastMessage = async () => {
      const res = await axios.get(`http://localhost:5000/api/last/${auth.id}`);
      setLastmessage(res.data);
    };
    fetchLastMessage();
  }, [auth]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const openChat = (userId: number) => {
    // Clear notifications for this user when opening chat
    setNotifications((prev) => ({ ...prev, [userId]: 0 }));
    navigate(`/chat/${userId}`);
  };

  // search users by username
  const searchUser = async () => {
    if (!auth || !searchQuery.trim()) {
      setSearchResults([]); // clear results if query empty
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:5000/api/users/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search error:", err);
    }
  }
  if (!auth) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-green-600">Chat Application </h1>
          <div className="flex m-2 p-2 justify-between w-full items-center">
            <h2 className="text-xl font-bold text-blue-600">Welcome, {auth.username}</h2>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Users Section */}
        <div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchUser()} placeholder="Type a name here" className="border border-gray-300 focus:border-green-500 focus:ring-green-500 p-2 m-2 w-full rounded-md outline-none transition" />
          <ul className="space-y-2 mt-2">
            {searchQuery.trim()
              ? searchResults.map((u) => (
                <li key={u.id} className="flex justify-between items-center p-2 ">
                  <span className="flex items-center space-x-2 text-gray-800">
                    <img
                      onClick={() => openChat(u.id)}
                      src="hoian.jpg"
                      alt="User Avatar"
                      className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    />
                    <span onClick={() => openChat(u.id)} className="text-green-800 cursor-pointer">
                      {u.username}
                    </span>
                    {notifications[u.id] > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-2 text-xs font-medium">
                        {notifications[u.id]}
                      </span>
                    )}
                  </span>
                </li>
              ))
              : users.map((u) => (
                <li key={u.id} className="flex justify-between items-center p-2 ">
                  <span className="flex items-center space-x-2 text-gray-800">
                    <img
                      onClick={() => openChat(u.id)}
                      src="hoian.jpg"
                      alt="User Avatar"
                      className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    />
                    <span onClick={() => openChat(u.id)} className="text-green-800 cursor-pointer">
                      {u.username}
                    </span>
                    {notifications[u.id] > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-2 text-xs font-medium">
                        {notifications[u.id]}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500 text-sm italic">
                    {(() => {
                      const lastMsg = lastmessage.find(
                        (m) =>
                          (m.senderId === u.id && m.receiverId === auth.id) ||
                          (m.senderId === auth.id && m.receiverId === u.id)
                      );
                      if (!lastMsg) return "No messages yet";
                      return lastMsg.senderId === auth.id ? `You: ${lastMsg.content}` : lastMsg.content;
                    })()}
                  </span>
                </li>
              ))
            }
          </ul>

        </div>
      </div>
    </div>

  );
}
