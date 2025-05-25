import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit2, Trash2, UserCheck2, UserX2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getUsersFromFirestore, updateUserInFirestore } from '@/lib/firebaseService/userService';
import {
  getAllTeachers,
  getTeacherProfileByUserId,
  deleteTeacherProfileInService, // Renamed to avoid confusion
} from '@/lib/firebaseService/teacherService';
import TeacherProfileForm from '@/components/admin/teachers/TeacherProfileForm';
import type { User, Teacher } from '@/types';
import { Badge } from '@/components/ui/badge';
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
import { writeBatch } from 'firebase/firestore';
import { Toaster } from '@/components/ui/sonner';


const ManageTeachersPage: React.FC = () => {
  const [teacherUsers, setTeacherUsers] = useState<User[]>([]);
  const [allTeacherProfiles, setAllTeacherProfiles] = useState<Teacher[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [selectedTeacherProfileForEdit, setSelectedTeacherProfileForEdit] = useState<Teacher | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherToDelete, setTeacherToDelete] = useState<{profileId: string, userId: string, userName: string} | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsersFromFirestore(db);
      const teachers = allUsers.filter(user => user.role === 'teacher');
      setTeacherUsers(teachers);

      const profiles = await getAllTeachers(db);
      setAllTeacherProfiles(profiles);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load teacher data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateProfileDialog = (user: User) => {
    setSelectedUserForProfile(user);
    setSelectedTeacherProfileForEdit(null);
    setFormMode('create');
    setShowProfileDialog(true);
  };

  const handleOpenEditProfileDialog = async (user: User) => {
    setSelectedUserForProfile(user);
    try {
      // Attempt to find an existing profile from the already fetched list first
      let profile = allTeacherProfiles.find(p => p.userId === user.uid);
      
      if (!profile && user.teacherId) { // If not in list, but teacherId exists, fetch directly
        toast.info("Fetching profile details...");
        profile = await getTeacherProfileByUserId(db, user.uid);
      }

      if (profile) {
        setSelectedTeacherProfileForEdit(profile);
        setFormMode('edit');
        setShowProfileDialog(true);
      } else {
        toast.info('No profile found for this teacher. You can create one.', { duration: 4000 });
        handleOpenCreateProfileDialog(user); // Switch to create mode if no profile exists
      }
    } catch (error) {
      toast.error('Failed to load teacher profile for editing.');
      console.error("Error fetching profile for edit: ", error);
    }
  };
  
  const handleOpenEditProfileDialogFromProfilesList = (profile: Teacher) => {
    const user = teacherUsers.find(u => u.uid === profile.userId);
    setSelectedUserForProfile(user || null); 
    setSelectedTeacherProfileForEdit(profile);
    setFormMode('edit');
    setShowProfileDialog(true);
  };

  const handleFormSuccess = () => {
    setShowProfileDialog(false);
    setSelectedUserForProfile(null);
    setSelectedTeacherProfileForEdit(null);
    fetchData(); 
  };

  const handleDeleteInitiate = (profile: Teacher) => {
    const userName = getUserName(profile.userId);
    setTeacherToDelete({profileId: profile.id, userId: profile.userId, userName});
  };

  const confirmDeleteProfile = async () => {
    if (!teacherToDelete) return;
    try {
      const batch = writeBatch(db);
      // 1. Delete the teacher profile document
      const teacherProfileRef = doc(db, 'teachers', teacherToDelete.profileId);
      batch.delete(teacherProfileRef);
      
      // 2. Update the user document to remove teacherId
      const userRef = doc(db, 'users', teacherToDelete.userId);
      batch.update(userRef, { teacherId: null }); // Or use deleteField() if you prefer to remove the field

      await batch.commit();
      toast.success(`Teacher profile for ${teacherToDelete.userName} deleted and user unlinked.`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting teacher profile:', error);
      toast.error('Failed to delete teacher profile.');
    } finally {
      setTeacherToDelete(null);
    }
  };

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown User';
    const user = teacherUsers.find(u => u.uid === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'User Not Found';
  };

  if (isLoading && teacherUsers.length === 0 && allTeacherProfiles.length === 0) {
    return <p className="text-center p-10">Loading teacher management data...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showProfileDialog} onOpenChange={(open) => {
        if (!open) { // Reset state when dialog is closed
          setSelectedUserForProfile(null);
          setSelectedTeacherProfileForEdit(null);
        }
        setShowProfileDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create Teacher Profile' : 'Edit Teacher Profile'}
              {selectedUserForProfile && ` for ${selectedUserForProfile.firstName} ${selectedUserForProfile.lastName}`}
              {!selectedUserForProfile && selectedTeacherProfileForEdit && ` for ${getUserName(selectedTeacherProfileForEdit.userId)}`}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to create a new teacher profile.'
                : 'Update the teacher profile information.'}
            </DialogDescription>
          </DialogHeader>
          {(selectedUserForProfile || selectedTeacherProfileForEdit) && ( // Ensure form has necessary IDs
            <TeacherProfileForm
              mode={formMode}
              userId={selectedUserForProfile?.uid} // For create mode or context
              teacherProfileId={selectedTeacherProfileForEdit?.id} // For edit mode
              userName={selectedUserForProfile ? `${selectedUserForProfile.firstName} ${selectedUserForProfile.lastName}` : getUserName(selectedTeacherProfileForEdit?.userId)}
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {teacherToDelete && (
        <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the teacher profile for <span className="font-semibold">{teacherToDelete.userName}</span>.
                The associated user account will be unlinked from this profile. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProfile} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50">Delete Profile</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage teacher roles, profiles, and assignments.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <UserCheck2 className="mr-3 h-6 w-6 text-primary" /> Teacher Users
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Users with the 'teacher' role. Create or edit their specific teacher profiles.
        </p>
        <div className="bg-card shadow sm:rounded-lg">
          {teacherUsers.length === 0 && !isLoading ? (
            <p className="p-6 text-muted-foreground">No users with 'teacher' role found.</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Profile Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherUsers.map(user => {
                const profile = allTeacherProfiles.find(p => p.userId === user.uid);
                return (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {profile ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Profile Linked</Badge>
                      ) : (
                        <Badge variant="secondary">No Profile</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {profile ? (
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditProfileDialog(user)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={() => handleOpenCreateProfileDialog(user)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Create Profile
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <UserX2 className="mr-3 h-6 w-6 text-primary" /> All Created Teacher Profiles
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Direct list of all created teacher profiles. You can edit or delete them here.
        </p>
        <div className="bg-card shadow sm:rounded-lg">
        {allTeacherProfiles.length === 0 && !isLoading ? (
          <p className="p-6 text-muted-foreground">No teacher profiles created yet.</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher Name</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Education</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTeacherProfiles.map(profile => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{getUserName(profile.userId)}</TableCell>
                <TableCell>{profile.specialization}</TableCell>
                <TableCell>{profile.experience} years</TableCell>
                <TableCell className="truncate max-w-xs" title={profile.education}>{profile.education}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Profile Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleOpenEditProfileDialogFromProfilesList(profile)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteInitiate(profile)} 
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
        </div>
      </section>
    </div>
  );
};

export default ManageTeachersPage;
