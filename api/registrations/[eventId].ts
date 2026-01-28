import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_storage";
import { getAuthUser } from "../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { eventId } = req.query;
  const id = parseInt(eventId as string);

  try {
    const registrations = await storage.getRegistrationsByEvent(id);
    const registrationsWithUsers = await Promise.all(
      registrations.map(async (reg) => {
        const user = await storage.getUser(reg.userId);
        return {
          ...reg,
          user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null,
        };
      })
    );
    res.json(registrationsWithUsers);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Kunde inte hämta anmälningar" });
  }
}
