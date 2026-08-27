import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

// Initialize Inngest Client
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// 1. User Creation Function
const syncUserCreation = inngest.createFunction(
    { 
        id: "sync-user-from-clerk",
        name: "Sync User Creation",
        triggers: [{ event: "clerk/user.created" }] 
    },
    async ({ event }) => { 
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
/// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
export const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {
        id: 'release-seats-delete-booking',
        name:"Release seat",
        triggers:[
          {event: "app/checkpayment"}
        ]
    },
async ({ event, step }) => {

    const tenMinutesLater = new Date(
        Date.now() + 10 * 60 * 1000
    );

    await step.sleepUntil(
        "wait-for-10-minutes",
        tenMinutesLater
    );

    await step.run(
        "check-payment-status",
        async () => {

            const bookingId = event.data.bookingId;

            const booking = await Booking.findById(
                bookingId
            );

            // Booking doesn't exist
            // OR payment has already been made
            if (!booking || booking.isPaid) {
                return;
            }

            // Find the show
            const show = await Show.findById(
                booking.show
            );

            if (!show) {
                return;
            }

            // Release booked seats
            booking.bookedSeats.forEach((seat) => {
                delete show.occupiedSeats[seat];
            });

            // Tell Mongoose that occupiedSeats was modified
            show.markModified("occupiedSeats");

            await show.save();

            // Delete unpaid booking
            await Booking.findByIdAndDelete(
                booking._id
            );

            console.log(
                `Booking ${bookingId} deleted and seats released`
            );
        }
    );
})

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking
];