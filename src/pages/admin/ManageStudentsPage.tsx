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
  getAllStudents,
  getStudentProfileByUserId, // To fetch specific profile if not in list
  deleteStudentProfileInService, // Service function to delete student doc
  // getStudentProfile, // May not be needed if we fetch all and filter by userId
} from '@/lib/firebaseService/studentService';
import StudentProfileForm from '@/components/admin/students/StudentProfileForm';
import type { User, Student } from '@/types';
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
import { writeBatch, doc } from 'firebase/firestore';
import { Toaster } from '@/components/ui/sonner';
import { format } from 'date-fns'; // For formatting dates

const ManageStudentsPage: React.FC = () => {
  const [studentUsers, setStudentUsers] = useState<User[]>([]);
  const [allStudentProfiles, setAllStudentProfiles] = useState<Student[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [selectedStudentProfileForEdit, setSelectedStudentProfileForEdit] = useState<Student | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studentToDelete, setStudentToDelete] = useState<{profileId: string, userId: string, userName: string} | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsersFromFirestore(db);
      const students = allUsers.filter(user => user.role === 'student');
      setStudentUsers(students);

      const profiles = await getAllStudents(db);
      setAllStudentProfiles(profiles);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load student data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateProfileDialog = (user: User) => {
    setSelectedUserForProfile(user);
    setSelectedStudentProfileForEdit(null);
    setFormMode('create');
    setShowProfileDialog(true);
  };

  const handleOpenEditProfileDialog = async (user: User) => {
    setSelectedUserForProfile(user);
    try {
      let profile = allStudentProfiles.find(p => p.userId === user.uid);
      if (!profile && user.studentId) { // user.studentId refers to the Student Profile Document ID
        toast.info("Fetching student profile details...");
        // Attempt to fetch by studentId (profile document ID) if available on user object
        // This might be redundant if allStudentProfiles is comprehensive.
        // Prefer getStudentProfileByUserId if user.studentId is the profile's doc ID.
        // For clarity, let's assume user.studentId stores the student profile document ID.
        // However, getStudentProfileByUserId expects a USER ID.
        // So, if user.studentId is the profile doc ID, use getStudentProfile(db, user.studentId)
        // If user.studentId is not set, but we want to find by user.uid, use getStudentProfileByUserId(db, user.uid)
        profile = await getStudentProfileByUserId(db, user.uid);
      }

      if (profile) {
        setSelectedStudentProfileForEdit(profile);
        setFormMode('edit');
        setShowProfileDialog(true);
      } else {
        toast.info('No profile found for this student. You can create one.', { duration: 4000 });
        handleOpenCreateProfileDialog(user); // Switch to create mode
      }
    } catch (error) {
      toast.error('Failed to load student profile for editing.');
      console.error("Error fetching profile for edit: ", error);
    }
  };
  
  const handleOpenEditProfileDialogFromProfilesList = (profile: Student) => {
    const user = studentUsers.find(u => u.uid === profile.userId);
    setSelectedUserForProfile(user || null); // User might not be in the list if role changed or issues
    setSelectedStudentProfileForEdit(profile);
    setFormMode('edit');
    setShowProfileDialog(true);
  };

  const handleFormSuccess = () => {
    setShowProfileDialog(false);
    setSelectedUserForProfile(null);
    setSelectedStudentProfileForEdit(null);
    fetchData(); 
  };

  const handleDeleteInitiate = (profile: Student) => {
    const userName = getUserName(profile.userId);
    setStudentToDelete({profileId: profile.id, userId: profile.userId, userName});
  };

  const confirmDeleteProfile = async () => {
    if (!studentToDelete) return;
    try {
      const batch = writeBatch(db);
      // 1. Delete the student profile document
      const studentProfileRef = doc(db, 'students', studentToDelete.profileId);
      batch.delete(studentProfileRef);
      
      // 2. Update the user document to remove/nullify studentId
      const userRef = doc(db, 'users', studentToDelete.userId);
      batch.update(userRef, { studentId: null }); // Or use deleteField() from 'firebase/firestore'

      await batch.commit();
      toast.success(`Student profile for ${studentToDelete.userName} deleted and user unlinked.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting student profile:', error);
      toast.error('Failed to delete student profile.');
    } finally {
      setStudentToDelete(null);
    }
  };

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown User';
    const user = studentUsers.find(u => u.uid === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'User Not Found';
  };

  if (isLoading && studentUsers.length === 0 && allStudentProfiles.length === 0) {
    return <p className="text-center p-10">Loading student management data...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showProfileDialog} onOpenChange={(open) => {
        if (!open) { // Reset state when dialog is closed by any means (X, cancel, overlay click)
          setSelectedUserForProfile(null);
          setSelectedStudentProfileForEdit(null);
        }
        setShowProfileDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create Student Profile' : 'Edit Student Profile'}
              {selectedUserForProfile && ` for ${selectedUserForProfile.firstName} ${selectedUserForProfile.lastName}`}
              {!selectedUserForProfile && selectedStudentProfileForEdit && ` for ${getUserName(selectedStudentProfileForEdit.userId)}`}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to create a new student profile.'
                : 'Update the student profile information.'}
            </DialogDescription>
          </DialogHeader>
          {/* Ensure form is rendered only when necessary data is available */}
          {( (formMode === 'create' && selectedUserForProfile) || (formMode === 'edit' && selectedStudentProfileForEdit) ) && (
            <StudentProfileForm
              mode={formMode}
              userId={selectedUserForProfile?.uid}
              studentProfileId={selectedStudentProfileForEdit?.id}
              userName={selectedUserForProfile ? `${selectedUserForProfile.firstName} ${selectedUserForProfile.lastName}` : getUserName(selectedStudentProfileForEdit?.userId)}
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {studentToDelete && (
        <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the student profile for <span className="font-semibold">{studentToDelete.userName}</span>.
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
        <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage student roles, profiles, and group assignments.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <UserCheck2 className="mr-3 h-6 w-6 text-primary" /> Student Users
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Users with the 'student' role. Create or edit their specific student profiles.
        </p>
        <div className="bg-card shadow sm:rounded-lg">
          {studentUsers.length === 0 && !isLoading ? (
            <p className="p-6 text-muted-foreground">No users with 'student' role found.</p>
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
              {studentUsers.map(user => {
                // Check if a profile exists for this user by matching userId in allStudentProfiles
                // or by checking if user.studentId (the profile doc ID) is set and corresponds to a loaded profile.
                const profile = allStudentProfiles.find(p => p.userId === user.uid);
                return (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {profile ? (
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Profile Linked</Badge>
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
            <UserX2 className="mr-3 h-6 w-6 text-primary" /> All Created Student Profiles
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Direct list of all created student profiles. You can edit or delete them here.
        </p>
        <div className="bg-card shadow sm:rounded-lg">
        {allStudentProfiles.length === 0 && !isLoading ? (
          <p className="p-6 text-muted-foreground">No student profiles created yet.</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Student Card ID</TableHead>
              <TableHead>Group ID</TableHead>
              <TableHead>Enrollment Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allStudentProfiles.map(profile => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{getUserName(profile.userId)}</TableCell>
                <TableCell>{profile.studentCardId}</TableCell>
                <TableCell>{profile.groupId}</TableCell>
                <TableCell>{format(profile.enrollmentDate.toDate(), "PPP")}</TableCell>
                <TableCell><Badge variant={profile.status === 'active' ? 'default' : 'outline'} className={
                    profile.status === 'active' ? 'bg-green-500 text-white' :
                    profile.status === 'graduated' ? 'bg-blue-500 text-white' :
                    'border-gray-500 text-gray-500'
                }>{profile.status}</Badge></TableCell>
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

export default ManageStudentsPage;
