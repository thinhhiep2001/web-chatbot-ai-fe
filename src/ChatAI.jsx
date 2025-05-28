import React, { useState, useEffect } from 'react';
import {
  FaSearch,
  FaPaperPlane,
  FaBars,
  FaUser,
  FaPlus,
  FaPaperclip,
  FaTimes,
  FaCog,
  FaSun,
  FaMoon,
  FaDesktop,
} from "react-icons/fa"
import {
  getAvailableBots,
  getSessions,
  getChatHistory,
  sendMessage,
  googleLogin,
  createSession,
} from './api/api';

const ChatApp = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [chatBots, setChatBots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [theme, setTheme] = useState("light")
  const [chatFontSize, setChatFontSize] = useState("medium");
  const [globalFontSize, setGlobalFontSize] = useState("medium");
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts
      selectedFiles.forEach((file) => {
        if (file.url) {
          URL.revokeObjectURL(file.url)
        }
      })
    }
  }, [])

  useEffect(() => {
    const fetchChatBots = async () => {
      try {
        setIsLoading(true);
        const response = await getAvailableBots();
        setChatBots(response.data);
        if (response.data.length > 0) {
          setSelectedChat(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching available chatbots:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatBots();
  }, []);

  useEffect(() => {
    if (!selectedChat || !user) return;
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const res = await getSessions(selectedChat, user.id);
        setSessions(res.data);
        if (res.data.length > 0) setSelectedSession(res.data[0].id);
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
        setSessions([]);
        setSelectedSession(null);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, [selectedChat, user]);

  useEffect(() => {
    if (!selectedSession || !user) return;
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        const response = await getChatHistory(selectedSession);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatHistory();
  }, [selectedSession, user]);

  const handleSendMessage = async () => {
    if (query.trim() === '' && selectedFiles.length === 0) return;
  
    let sessionId = selectedSession;

    if (selectedSession === 'new') {
      try {
        const res = await createSession(selectedChat, user.id, `New Chat ${Date.now()}`);
        sessionId = res.data.id;
        setSelectedSession(sessionId);
        setSessions(prev => [...prev, res.data]);
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }
  
    const userMessage = {
      sender: 'You',
      text: query,
      time: new Date().toLocaleTimeString().slice(0, 5),
      sessionId,
      userId: user.id,
      files: selectedFiles,
    };
  
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setSelectedFiles([]);
  
    try {
      const result = await sendMessage(userMessage);
      setMessages(prev => [...prev, result.data]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage = {
        sender: selectedChat,
        text: "Sorry, I couldn't process your message. Please try again.",
        time: new Date().toLocaleTimeString().slice(0, 5),
      };
      setMessages((prev) => [...prev, errorMessage])
    }
  };
  
  const handleFileChange = async (e) => {
    const newFiles = Array.from(e.target.files);
    const currentFileCount = selectedFiles.length;
    const availableSlots = 5 - currentFileCount;

    if (newFiles.length > availableSlots) {
      alert(`Bạn chỉ có thể thêm ${availableSlots} file nữa! (Tối đa 5 file)`);
      e.target.value = "";
      return;
    }

    const processedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const isImage = file.type.startsWith("image/");
        const isTextOrPdf = file.type === "text/plain" || file.type === "application/pdf";

        if (isImage) {
          const base64 = await toBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64,
            isImage: true,
            url: URL.createObjectURL(file)
          };
        } else if (isTextOrPdf) {
          const text = await file.text();
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: text,
            isImage: false,
            url: null
          };
        } else {
          return null
        }
      }),
    );

    setSelectedFiles((prev) => [...prev, ...processedFiles.filter((f) => f !== null)]);
    e.target.value = "";
  };
  
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });  

  const handleGoogleSuccess = async (response) => {
    try {
      const { credential } = response;
      const res = await googleLogin(credential);

      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setIsLoginDialogOpen(false);
    } catch (error) {
      console.error('Error during Google login:', error);
      alert("Login failed. Please try again.")
    }
  };

  const handleCreateNewSession = async () => {
    setSelectedSession('new');
    setMessages([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSelectedSession(null);
    setMessages([]);
    setSessions([]);
  };

  const getFontSizeClass = (size, isGlobal = false) => {
    switch (size) {
      case "small":
        return isGlobal ? "text-sm" : "text-sm"
      case "large":
        return isGlobal ? "text-lg" : "text-lg"
      default:
        return isGlobal ? "text-base" : "text-base"
    }
  };

  const getThemeClasses = () => {
    if (theme === "night") {
      return "night-mode bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-cyan-100"
    }
    return "light-mode bg-gradient-to-br from-blue-50 via-white to-cyan-50 text-slate-800"
  };

  const getCardClasses = () => {
    if (theme === "night") {
      return "bg-slate-800/80 border-slate-700/50 backdrop-blur-sm shadow-xl shadow-cyan-500/10 rounded-2xl border"
    }
    return "bg-white/90 border-slate-200 backdrop-blur-sm shadow-lg rounded-2xl border"
  };

  const getInputClasses = () => {
    if (theme === "night") {
      return "bg-slate-700/50 border-slate-600 text-cyan-100 placeholder:text-slate-400 focus:border-cyan-400 w-full p-2 rounded-lg border outline-none transition-colors"
    }
    return "bg-white border-slate-300 text-slate-800 placeholder:text-slate-500 focus:border-blue-400 w-full p-2 rounded-lg border outline-none transition-colors"
  };

  const getButtonClasses = (variant = "default") => {
    const baseClasses =
      "px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer border outline-none"

    if (theme === "night") {
      if (variant === "primary") {
        return `${baseClasses} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 border-transparent`
      }
      return `${baseClasses} bg-slate-700/50 hover:bg-slate-600/50 text-cyan-100 border-slate-600`
    }
    if (variant === "primary") {
      return `${baseClasses} bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg border-transparent`
    }
    return `${baseClasses} bg-white hover:bg-slate-50 text-slate-800 border-slate-300`
  };

  const getIconButtonClasses = (variant = "default") => {
    const baseClasses =
      "p-2 rounded-full transition-all duration-200 cursor-pointer border outline-none flex items-center justify-center"

    if (theme === "night") {
      if (variant === "primary") {
        return `${baseClasses} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 border-transparent`
      }
      return `${baseClasses} bg-slate-700/50 hover:bg-slate-600/50 text-cyan-100 border-slate-600`
    }
    if (variant === "primary") {
      return `${baseClasses} bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg border-transparent`
    }
    return `${baseClasses} bg-white hover:bg-slate-50 text-slate-800 border-slate-300`
  };

  return (
    <div
      className={`flex h-screen p-6 flex-col md:flex-row transition-all duration-500 ${getThemeClasses()} ${getFontSizeClass(globalFontSize, true)}`}
    >
      {/* Mobile menu button */}
      <button
        className={`fixed top-4 left-4 z-50 md:hidden ${getIconButtonClasses()}`}
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
      >
        <FaBars className="w-4 h-4" />
      </button>

      {/* User menu */}
      <div className="fixed top-4 right-4 z-50 flex items-center">
        {/* Settings button */}
        <button className={`mr-4 ${getIconButtonClasses("primary")}`} onClick={() => setIsSettingsOpen(true)}>
          <FaCog className="w-4 h-4" />
        </button>
        <div className="relative group flex items-center">
          <button
            className={`transition-all duration-300 transform group-hover:-translate-x-4 ${getIconButtonClasses("primary")}`}
            onClick={() => setIsLoginDialogOpen(true)}
          >
            <FaUser className="w-4 h-4" />
          </button>
          <div className="flex ml-auto relative">
            {user ? (
              <button
                className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm ${getButtonClasses()}`}
                onClick={handleLogout}
              >
                Logout
              </button>
            ) : (
              <button
                className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm ${getButtonClasses()}`}
                onClick={() => setIsLoginDialogOpen(true)}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      {isLoginDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-[600px] overflow-hidden ${getCardClasses()}`}>
            <div className="flex">
              <div
                className={`w-1/3 ${theme === "night" ? "bg-gradient-to-br from-cyan-600 to-blue-600" : "bg-gradient-to-br from-blue-400 to-cyan-500"} text-white flex flex-col items-center justify-center p-5 rounded-l-2xl`}
              >
                <div className="text-2xl font-bold">CHATBOTAI</div>
                <p className="text-sm mt-2">Perfection Chat Bot</p>
              </div>
              <div className="w-2/3 p-6 relative">
                <button
                  className={`absolute top-2 right-2 ${getIconButtonClasses()}`}
                  onClick={() => setIsLoginDialogOpen(false)}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
                <h2 className={`text-xl font-semibold mb-1 ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Login <span className={theme === "night" ? "text-slate-400" : "text-gray-400"}>/ Sign up</span>
                </h2>
                <p className={`text-xs mb-4 ${theme === "night" ? "text-slate-400" : "text-gray-400"}`}>
                  Sign in using Google
                </p>

                {/* Google Login */}
                <div className="mb-4">
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.error("Google Login Failed")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-[500px] max-h-[80vh] overflow-y-auto ${getCardClasses()}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-semibold ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Settings
                </h2>
                <button className={getIconButtonClasses()} onClick={() => setIsSettingsOpen(false)}>
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* Theme Settings */}
              <div className="mb-6">
                <h3 className={`text-lg font-medium mb-3 ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className={`flex items-center gap-2 justify-center ${theme === "light" ? getButtonClasses("primary") : getButtonClasses()}`}
                    onClick={() => setTheme("light")}
                  >
                    <FaSun className="w-4 h-4" />
                    Light
                  </button>
                  <button
                    className={`flex items-center gap-2 justify-center ${theme === "night" ? getButtonClasses("primary") : getButtonClasses()}`}
                    onClick={() => setTheme("night")}
                  >
                    <FaMoon className="w-4 h-4" />
                    Night
                  </button>
                  <button
                    className={`flex items-center gap-2 justify-center ${theme === "system" ? getButtonClasses("primary") : getButtonClasses()}`}
                    onClick={() => setTheme("system")}
                  >
                    <FaDesktop className="w-4 h-4" />
                    System
                  </button>
                </div>
              </div>

              {/* Chat Font Size */}
              <div className="mb-6">
                <h3 className={`text-lg font-medium mb-3 ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Chat Font Size
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className={chatFontSize === "small" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setChatFontSize("small")}
                  >
                    <span className="text-sm">Small</span>
                  </button>
                  <button
                    className={chatFontSize === "medium" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setChatFontSize("medium")}
                  >
                    <span className="text-base">Medium</span>
                  </button>
                  <button
                    className={chatFontSize === "large" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setChatFontSize("large")}
                  >
                    <span className="text-lg">Large</span>
                  </button>
                </div>
              </div>

              {/* Global Font Size */}
              <div className="mb-6">
                <h3 className={`text-lg font-medium mb-3 ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Global Font Size
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className={globalFontSize === "small" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setGlobalFontSize("small")}
                  >
                    <span className="text-sm">Small</span>
                  </button>
                  <button
                    className={globalFontSize === "medium" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setGlobalFontSize("medium")}
                  >
                    <span className="text-base">Medium</span>
                  </button>
                  <button
                    className={globalFontSize === "large" ? getButtonClasses("primary") : getButtonClasses()}
                    onClick={() => setGlobalFontSize("large")}
                  >
                    <span className="text-lg">Large</span>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div
                className={`border rounded-lg p-4 ${theme === "night" ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}
              >
                <h4 className={`font-medium mb-2 ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  Preview
                </h4>
                <div className="space-y-2">
                  <div
                    className={`p-2 rounded-lg max-w-xs ${getFontSizeClass(chatFontSize)} ${theme === "night" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-blue-500 text-white"}`}
                  >
                    Sample chat message
                  </div>
                  <div
                    className={`p-2 rounded-lg max-w-xs ${getFontSizeClass(chatFontSize)} ${theme === "night" ? "bg-slate-600 text-cyan-100" : "bg-gray-200 text-slate-800"}`}
                  >
                    AI response message
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarVisible && (
        <div className={`w-full md:w-1/4 md:block ${getCardClasses()}`}>
          <div className="p-4">
            <div className="flex items-center mb-4">
              <img
                src={user?.picture || "https://via.placeholder.com/40"}
                alt="Profile"
                className="w-10 h-10 rounded-full mr-2 object-cover"
              />
              <div>
                <h3 className={`font-bold ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                  {user?.name || "Guest"}
                </h3>
                <p className={`text-sm ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                  @{user?.email?.split("@")[0] || "unknown"}
                </p>
              </div>
            </div>

            <div className="relative mb-4">
              <FaSearch
                className={`absolute left-2 top-2.5 w-4 h-4 ${theme === "night" ? "text-slate-400" : "text-gray-400"}`}
              />
              <input
                type="text"
                placeholder="Search chatbots"
                className={`pl-8 ${getInputClasses()}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className={`text-center py-4 ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                    <p className="text-sm">Loading chatbots...</p>
                  </div>
                ) : (
                  <>
                    {chatBots
                      .filter((bot) => bot.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((name, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedChat === name
                              ? theme === "night"
                                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
                                : "bg-blue-100 border border-blue-200"
                              : theme === "night"
                                ? "hover:bg-slate-700/50"
                                : "hover:bg-gray-100"
                          }`}
                          onClick={() => setSelectedChat(name)}
                        >
                          <div className="flex items-center">
                            <img
                              src="https://via.placeholder.com/40"
                              alt="Avatar"
                              className="w-10 h-10 rounded-full mr-2 object-cover"
                            />
                            <div>
                              <h4 className={`font-medium ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                                {name}
                              </h4>
                              <p className={`text-xs ${theme === "night" ? "text-slate-400" : "text-gray-400"}`}>
                                AI Assistant
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {chatBots.filter((bot) => bot.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 &&
                      !isLoading && (
                        <div className={`text-center py-4 ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                          <p className="text-sm">Không tìm thấy chatbot</p>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>

            {selectedChat && user && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                    Sessions
                  </span>
                  <button className={getIconButtonClasses()} onClick={handleCreateNewSession}>
                    <FaPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="space-y-2 pr-2">
                    {isLoading ? (
                      <div className={`text-center py-2 ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                        <p className="text-sm">Loading sessions...</p>
                      </div>
                    ) : (
                      <>
                        {sessions.map((session, i) => (
                          <div
                            key={i}
                            className={`cursor-pointer p-2 rounded-lg transition-colors ${
                              selectedSession === session.id
                                ? theme === "night"
                                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
                                  : "bg-blue-100 border border-blue-200"
                                : theme === "night"
                                  ? "hover:bg-slate-700/50"
                                  : "hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectedSession(session.id)}
                          >
                            <span className={theme === "night" ? "text-cyan-100" : "text-slate-800"}>
                              {session.name || `Session ${i + 1}`}
                            </span>
                          </div>
                        ))}
                        {sessions.length === 0 && !isLoading && (
                          <div className={`text-center py-2 ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                            <p className="text-sm">Chưa có session</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className={`flex-1 ml-0 md:ml-6 flex flex-col ${getCardClasses()}`}>
        <div className="p-6 flex flex-col h-full">
          {selectedChat && (selectedSession || selectedSession === "new") && user ? (
            <>
              <div
                className={`flex justify-between items-center border-b pb-4 ${theme === "night" ? "border-slate-700" : "border-gray-200"}`}
              >
                <div className="flex items-center">
                  <img
                    src="https://via.placeholder.com/40"
                    alt="AI"
                    className="w-10 h-10 rounded-full mr-2 object-cover"
                  />
                  <div>
                    <h3 className={`font-bold ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}>
                      {selectedChat}
                    </h3>
                    <p className={`text-sm ${theme === "night" ? "text-emerald-400" : "text-green-500"}`}>Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && messages.length === 0 ? (
                  <div className={`text-center py-4 ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                    <p className="text-sm">Loading messages...</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`p-3 rounded-lg max-w-xs lg:max-w-md ${getFontSizeClass(chatFontSize)} ${
                          msg.sender === "You"
                            ? theme === "night"
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                              : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                            : theme === "night"
                              ? "bg-slate-700/70 text-cyan-100 border border-slate-600/50"
                              : "bg-gray-100 text-slate-800 border border-gray-200"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span className="block text-xs opacity-70 mt-1">{msg.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <div
                    className={`text-sm mb-2 ${selectedFiles.length >= 5 ? "text-red-400 font-medium" : theme === "night" ? "text-slate-400" : "text-gray-500"}`}
                  >
                    Đã chọn {selectedFiles.length}/5 file {selectedFiles.length >= 5 && "(Tối đa)"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        {file.isImage ? (
                          // Image preview
                          <div className="relative group">
                            <img
                              src={file.url || "https://via.placeholder.com/80"}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <button
                                className="w-6 h-6 p-0 text-white hover:bg-red-500 rounded-full flex items-center justify-center"
                                onClick={() => {
                                  const newFiles = [...selectedFiles]
                                  if (newFiles[index].url) {
                                    URL.revokeObjectURL(newFiles[index].url)
                                  }
                                  newFiles.splice(index, 1)
                                  setSelectedFiles(newFiles)
                                }}
                              >
                                <FaTimes className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg truncate">
                              {file.name}
                            </div>
                          </div>
                        ) : (
                          // Non-image file info
                          <div
                            className={`px-3 py-2 rounded-lg text-sm flex items-center min-w-[200px] ${theme === "night" ? "bg-slate-700/50 border border-slate-600" : "bg-gray-100 border border-gray-200"}`}
                          >
                            <div className="flex-1">
                              <div
                                className={`truncate font-medium ${theme === "night" ? "text-cyan-100" : "text-slate-800"}`}
                              >
                                {file.name}
                              </div>
                              <div className={`text-xs ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}>
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <button
                              className={`ml-2 w-4 h-4 p-0 ${theme === "night" ? "text-slate-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"} flex items-center justify-center`}
                              onClick={() => {
                                const newFiles = [...selectedFiles]
                                newFiles.splice(index, 1)
                                setSelectedFiles(newFiles)
                              }}
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div
                className={`flex items-center border-t pt-4 gap-2 ${theme === "night" ? "border-slate-700" : "border-gray-200"}`}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 ${getInputClasses()}`}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={selectedFiles.length >= 5}
                />
                <label htmlFor="fileInput">
                  <button
                    disabled={selectedFiles.length >= 5}
                    className={`${getIconButtonClasses()} ${selectedFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <FaPaperclip className="w-4 h-4" />
                  </button>
                </label>
                <button onClick={handleSendMessage} className={getIconButtonClasses("primary")}>
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div
              className={`flex flex-col items-center justify-center h-full ${theme === "night" ? "text-slate-400" : "text-gray-500"}`}
            >
              {!user ? (
                <>
                  <p className="text-lg font-semibold">Please login to start chatting</p>
                  <p className="text-sm">Click the user icon to sign in</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">Select a chatbot to start a conversation</p>
                  <p className="text-sm">Your chat history will appear here.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
