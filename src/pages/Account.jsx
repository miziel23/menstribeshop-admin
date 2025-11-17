// deno-lint-ignore-file
import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Calendar, Key, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: currentUser, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
        return;
      }
      setUser(currentUser.user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleChangePassword = async () => {
    setPasswordMessage(""); // reset message

    if (!oldPassword || !newPassword || !confirmPassword) {
      return setPasswordMessage("Please fill in all fields.");
    }
    if (newPassword !== confirmPassword) {
      return setPasswordMessage("New password and confirm password do not match.");
    }
    if (!validatePassword(newPassword)) {
      return setPasswordMessage(
        "Password must be at least 8 characters, include uppercase, lowercase, and a number."
      );
    }

    setUpdating(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        setPasswordMessage("Old password is incorrect.");
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          setPasswordMessage("Failed to update password: " + updateError.message);
        } else {
          setPasswordMessage("Password updated successfully!");
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err) {
      console.error(err);
      setPasswordMessage("Something went wrong.");
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return <div className="p-10 text-center">No user found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2 text-green-600">
          <User /> My Profile
        </h2>

        {/* User Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Mail />
            <span>{user.email}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <User />
            <span>{user.user_metadata?.full_name || "No full name set"}</span>
          </div>

          {user.phone && (
            <div className="flex items-center justify-center gap-3">
              <Phone />
              <span>{user.phone}</span>
            </div>
          )}

          {user.user_metadata?.birthday && (
            <div className="flex items-center justify-center gap-3">
              <Calendar />
              <span>{user.user_metadata.birthday}</span>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="space-y-2 mt-4">
          <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
            <Key /> Change Password
          </h3>

          {/* Inline message */}
          {passwordMessage && (
            <p className={`text-center text-sm ${passwordMessage.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
              {passwordMessage}
            </p>
          )}

          {/* Old Password */}
          <div className="relative">
            <input
              type={showOld ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Old Password"
              className="border rounded px-2 py-2 w-full pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center bg-transparent p-0"
              onClick={() => setShowOld(!showOld)}
            >
              {showOld ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              className="border rounded px-2 py-2 w-full pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center bg-transparent p-0"
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="border rounded px-2 py-2 w-full pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center bg-transparent p-0"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          {/* Policy */}
          <p className="text-sm text-gray-500 text-center">
            Password must be at least 8 characters, include uppercase, lowercase, and a number.
          </p>

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full mt-2"
            onClick={handleChangePassword}
            disabled={updating}
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
