import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useLocation } from "wouter";

export default function Welcome() {
  const [name, setName] = useState("");
  const { setName: saveUser } = useUser();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveUser(name.trim());
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">SocialBoule</h1>
          <p className="text-gray-600">Välkommen till boule-kvällen!</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Vad heter du?
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input text-lg"
                placeholder="Ditt namn"
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full text-lg py-3">
              Kom igång
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Inga konton behövs - ange bara ditt namn!
        </p>
      </div>
    </div>
  );
}
