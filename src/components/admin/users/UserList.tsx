import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getUsersFromFirestore, deleteUserFromFirestore } from '@/lib/firebaseService/userService';
import type { User } from '@/types';
import EditUserDialog from './EditUserDialog'; // Ensure this path is correct
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Timestamp } from 'firebase/firestore';

interface UserListProps {
  key?: number; // Allow key prop for re-fetching on demand
}

const UserList: React.FC<UserListProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getUsersFromFirestore(db);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleDeleteInitiate = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      // Note: This only deletes the Firestore document.
      // The Firebase Auth user is NOT deleted by this client-side action.
      // A Firebase Function using the Admin SDK would be needed for full cleanup.
      await deleteUserFromFirestore(db, deletingUser.uid);
      toast.success(`User ${deletingUser.firstName} ${deletingUser.lastName} deleted from Firestore.`);
      setUsers(prevUsers => prevUsers.filter(u => u.uid !== deletingUser.uid));
    } catch (error) {
      console.error("Error deleting user from Firestore:", error);
      toast.error("Failed to delete user.");
    } finally {
      setDeletingUser(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleUserUpdated = () => {
    fetchUsers(); // Refetch users after an update
  };
  
  const formatDate = (timestamp: Timestamp | undefined | null): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  if (loading) {
    return <p>Loading users...</p>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteInitiate(user)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showEditDialog && editingUser && (
        <EditUserDialog
          user={editingUser}
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) setEditingUser(null); // Clear editing user when dialog closes
          }}
          onUserUpdated={() => {
            setShowEditDialog(false);
            setEditingUser(null);
            handleUserUpdated(); // Refetch or update local state
          }}
        />
      )}

      {showDeleteConfirm && deletingUser && (
         <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
               <AlertDialogDescription>
                 This action will delete the user <span className="font-semibold">{deletingUser.firstName} {deletingUser.lastName}</span> from Firestore.
                 <br />
                 <span className="font-semibold text-orange-600">The Firebase Authentication user will NOT be deleted.</span>
                 <br />
                 This operation cannot be undone from the client-side.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setDeletingUser(null)}>Cancel</AlertDialogCancel>
               <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
               >
                 Delete Firestore Document
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      )}
    </div>
  );
};

export default UserList;
