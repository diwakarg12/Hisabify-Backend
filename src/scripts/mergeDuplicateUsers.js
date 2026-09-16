const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust relative path as needed
const User = require('../models/user.model');
const Group = require('../models/group.model');
const Expense = require('../models/expense.model');
const SplitExpense = require('../models/splitExpense.model');
const Invitation = require('../models/invitation.model');
const Notification = require('../models/notification.model');

async function mergeDuplicateUsers() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
        if (!mongoUri) {
            console.error("MongoDB URI not found in environment variables.");
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        // Fetch all users
        const users = await User.find({});
        console.log(`Total users found: ${users.length}`);

        // Group users by lowercase email
        const emailGroupMap = {};
        for (const user of users) {
            const lowerEmail = user.email.toLowerCase().trim();
            if (!emailGroupMap[lowerEmail]) {
                emailGroupMap[lowerEmail] = [];
            }
            emailGroupMap[lowerEmail].push(user);
        }

        let duplicatesFound = 0;

        for (const [email, userList] of Object.entries(emailGroupMap)) {
            if (userList.length > 1) {
                duplicatesFound++;
                console.log(`\n--------------------------------------------------`);
                console.log(`Found ${userList.length} duplicate accounts for email: ${email}`);

                // Sort by createdAt ascending (earliest created is primary)
                userList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                const primaryUser = userList[0];
                const duplicateUsers = userList.slice(1);

                console.log(`Primary Account to keep: ID ${primaryUser._id} (${primaryUser.email}) created at ${primaryUser.createdAt}`);
                
                for (const dup of duplicateUsers) {
                    console.log(`Merging duplicate Account: ID ${dup._id} (${dup.email}) -> Primary ID ${primaryUser._id}`);

                    // 1. Reassign Group membership & ownership
                    await Group.updateMany({ createdBy: dup._id }, { createdBy: primaryUser._id });
                    
                    // Add primary user to groups where duplicate user was a member, then pull duplicate user
                    const dupGroups = await Group.find({ members: dup._id });
                    for (const group of dupGroups) {
                        if (!group.members.map(m => m.toString()).includes(primaryUser._id.toString())) {
                            group.members.push(primaryUser._id);
                        }
                        group.members = group.members.filter(m => m.toString() !== dup._id.toString());
                        await group.save();
                    }

                    // 2. Reassign Expenses
                    if (Expense) {
                        await Expense.updateMany({ paidBy: dup._id }, { paidBy: primaryUser._id });
                        await Expense.updateMany({ createdFor: dup._id }, { createdFor: primaryUser._id });
                    }

                    // 3. Reassign SplitExpenses
                    if (SplitExpense) {
                        await SplitExpense.updateMany({ user: dup._id }, { user: primaryUser._id });
                        await SplitExpense.updateMany({ paidBy: dup._id }, { paidBy: primaryUser._id });
                    }

                    // 4. Reassign Invitations
                    if (Invitation) {
                        await Invitation.updateMany({ invitedBy: dup._id }, { invitedBy: primaryUser._id });
                        await Invitation.updateMany({ invitedTo: dup._id }, { invitedTo: primaryUser._id });
                    }

                    // 5. Reassign Notifications
                    if (Notification) {
                        await Notification.updateMany({ userId: dup._id }, { userId: primaryUser._id });
                    }

                    // 6. Delete duplicate user record
                    await User.findByIdAndDelete(dup._id);
                    console.log(`Successfully deleted duplicate user ID: ${dup._id}`);
                }

                // Ensure primary user email is lowercased
                primaryUser.email = email;
                await primaryUser.save();
                console.log(`Updated Primary User email to lowercased version: ${primaryUser.email}`);
            }
        }

        if (duplicatesFound === 0) {
            console.log("\nNo duplicate accounts found!");
        } else {
            console.log(`\nSuccessfully resolved ${duplicatesFound} duplicate email group(s).`);
        }

        // Re-sync Mongoose indexes to ensure unique index works properly on lowercase emails
        console.log("Syncing MongoDB indexes for User collection...");
        await User.syncIndexes();
        console.log("User collection indexes synced successfully.");

    } catch (error) {
        console.error("Error during duplicate cleanup:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

mergeDuplicateUsers();
