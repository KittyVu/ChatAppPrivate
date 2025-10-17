import React from 'react'

export default function User() {
  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
      <div className="p-6 max-w-sm w-full bg-white rounded-lg shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-center text-green-600">Login</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="border border-gray-300 focus:border-green-500 focus:ring-green-500 p-2 w-full rounded-md outline-none transition"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="border border-gray-300 focus:border-green-500 focus:ring-green-500 p-2 w-full rounded-md outline-none transition"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="bg-green-500 hover:bg-green-600 text-white w-full p-2 rounded-md font-medium transition">
            Sign in
          </button>
        </form>
        <p className="mt-3 text-sm text-center text-gray-600">
          No account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-green-600 hover:text-green-700 font-medium cursor-pointer transition"
          >
            Signup
          </span>
        </p>
      </div>
    </div>
  )
}
