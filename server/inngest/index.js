import { Inngest } from "inngest";
import User from "../Models/User.js";

// Initialize Inngest Client
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// 1. User Creation Function
const syncUserCreation = inngest.createFunction(
    { 
        id: "sync-user-from-clerk",
        name: "Sync User Creation",
        triggers: [{ event: "clerk/user.created" }] // Pehle argument ke andar triggers array
    },
    async ({ event }) => { // Doosra argument sirf handler function
        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        const userData = {
            _id: id,
            email: email_addresses?.[0]?.email_address || "",
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            image: image_url,
        };
        await User.findByIdAndUpdate(id, userData, { upsert: true, new: true });
    }
);

// 2. User Deletion Function
const syncUserDeletion = inngest.createFunction(
    { 
        id: "delete-user-with-clerk",
        name: "Sync User Deletion",
        triggers: [{ event: "clerk/user.deleted" }]
    },
    async ({ event }) => {
        const { id } = event.data;
        await User.findByIdAndDelete(id);
    }
);

// 3. User Updation Function
const syncUserUpdation = inngest.createFunction(
    { 
        id: "update-user-from-clerk",
        name: "Sync User Updation",
        triggers: [{ event: "clerk/user.updated" }]
    },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        const userData = {
            _id: id,
            email: email_addresses?.[0]?.email_address || "",
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            image: image_url,
        };
        await User.findByIdAndUpdate(id, userData);
    }
);

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];