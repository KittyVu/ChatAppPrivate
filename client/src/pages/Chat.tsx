import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface MessageType {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  senderUsername: string;
  createdAt: string;
}

let socket: Socket;

export default function Chat() {
  // get id and show partner's name
  const { id } = useParams();
  const otherId = Number(id);
  const [otherName, setOtherName] = useState("");

  const navigate = useNavigate();

  const [auth, setAuth] = useState<{ id: number; username: string } | null>(null);

  // messages state
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [hasMore, setHasMore] = useState(true);

  // search content
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageType[]>([]);

  // control message input
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // check authentication
  useEffect(() => {
    const uid = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    if (!uid || !username) navigate("/login");
    else setAuth({ id: Number(uid), username });
  }, [navigate]);

  // fetch other user's name
  useEffect(() => {
    fetch("http://localhost:5000/api/users/" + otherId).then((res) => res.json()).then((data) => {
      if (!data.id) {
        alert("User not found");
        navigate("/");
      } else {
        setOtherName(data.username);
      }
    });
  }, [otherId, navigate]);

  // setup socket + listen for messages
  useEffect(() => {
    if (!auth) return;
    if (!socket) socket = io("http://localhost:5000");
    // make a unique room for 2 users and join it
    const room = `room_${Math.min(auth.id, otherId)}_${Math.max(auth.id, otherId)}`;
    socket.emit("joinRoom", room);
    // listen for newMessage from server
    socket.on("newMessage", (msg: MessageType) => {
      if (
        (msg.senderId === auth.id && msg.receiverId === otherId) ||
        (msg.senderId === otherId && msg.receiverId === auth.id)
      ) setMessages((prev) => [...prev, msg]);
    });

    return () => { socket.off("newMessage"); };
  }, [auth, otherId]);

  // fetch chat history  
  useEffect(() => {
    if (!auth) return;
    const fetchHistory = async () => {
      const res = await axios.get(`http://localhost:5000/api/messages/${auth.id}/${otherId}?limit=${limit}&offset=${offset}`);
      setMessages(prev => [...res.data.reverse(), ...prev]);  // reverse because we want to show old messages on top
    };
    fetchHistory();
  }, [auth, otherId, offset]);

  // auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // send message
  const sendMessage = () => {
    if (!input.trim() || !auth) return;
    // emit(send) message to server
    socket.emit("sendMessage", { content: input, senderId: auth.id, receiverId: otherId, senderUsername: auth.username });
    setInput("");
  };

  // load more messages
  const loadMore = async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);

    const res = await fetch(
      `http://localhost:5000/api/messages/${auth.id}/${otherId}?limit=${limit}&offset=${newOffset}`
    );
    const data = await res.json();
    if (data.length < limit) setHasMore(false);
    setMessages(prev => [...data.reverse(), ...prev]);
  };

  // search messages
  const searchMessages = async () => {
    if (!auth || !searchQuery.trim()) {
      setSearchResults([]); // clear results if query empty
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:5000/api/messages/search/${auth.id}/${otherId}?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };


  if (!auth) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 p-6 flex flex-col">
      <div className="max-w-2xl mx-auto flex flex-col h-full w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4">

        {/* Header */}
        <div className="flex justify-start gap-6 items-center">
          <button
            className="text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
            onClick={() => navigate("/")}
          >
            ❮
          </button>
          <div className="flex justify-between items-center gap-2">
            <img
              src="../muine.jpg"
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover cursor-pointer"
            />
            <span className="text-green-800">{otherName}</span>
          </div>
        </div>

        {/* searchbar */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMessages()}
            placeholder="Search messages"
            className="border p-2 rounded w-[85%] mb-2"
          />
          <button
            onClick={searchMessages}
            className="bg-blue-500 text-white px-3 py-1 rounded ml-2"
          >
            Search
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-2xl shadow-inner space-y-2"
        >
          {messages.length === 0 ? (
            <p>No messages yet</p>
          ) : searchQuery
            ? (
              searchResults.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderId === auth.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-xs ${m.senderId === auth.id ? "bg-green-100" : "bg-gray-100"
                      }`}
                  >
                    <div className="text-sm font-medium text-green-600">
                      {m.senderUsername}
                    </div>
                    <div className="text-sm text-gray-800">{m.content}</div>
                    <div className="text-xs text-gray-400 text-right">
                      {new Date(m.createdAt).toLocaleDateString()}{" "}
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {hasMore && (
                  <p
                    onClick={loadMore}
                    className="text-center text-green-600 cursor-pointer"
                  >
                    Load more...
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.senderId === auth.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs ${m.senderId === auth.id ? "bg-green-100" : "bg-gray-100"
                        }`}
                    >
                      <div className="text-sm font-medium text-green-600">
                        {m.senderUsername}
                      </div>
                      <div className="text-sm text-gray-800">{m.content}</div>
                      <div className="text-xs text-gray-400 text-right">
                        {new Date(m.createdAt).toLocaleDateString()}{" "}
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
        </div>

        {/* Input */}
        {!searchQuery && (
          <div className="flex mt-4 space-x-2">
            <input
              className="flex-1 p-2 border border-gray-300 rounded-md outline-none focus:border-green-500 focus:ring-green-500 transition"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition cursor-pointer"
            >
              Send
            </button>
          </div>
        )}

      </div>
    </div>

  );
}
