import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_storage";
import { getAuthUser } from "../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(authUser.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const allUsers = await storage.getAllUsers();
      return res.json(
        allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isAdmin: u.isAdmin,
          status: u.status,
          createdAt: u.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta användare" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
