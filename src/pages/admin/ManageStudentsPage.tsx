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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { functions } from '@/lib/firebase'; // Ensure 'functions' is imported for httpsCallable

interface CombinedStudent {
  user: User;
  profile?: Student; // Student profile can be undefined if not found/linked
  isOrphanedProfile?: boolean; // Flag for profiles without a user
  // If it's an orphaned profile, 'user' might be partially constructed or minimal
}

const ManageStudentsPage: React.FC = () => {
  // Remove studentUsers and allStudentProfiles states, will be combined into one.
  // const [studentUsers, setStudentUsers] = useState<User[]>([]);
  // const [allStudentProfiles, setAllStudentProfiles] = useState<Student[]>([]);
  const [combinedStudentData, setCombinedStudentData] = useState<CombinedStudent[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null); // Still needed for creating profile for a user
  const [selectedStudentDataForEdit, setSelectedStudentDataForEdit] = useState<CombinedStudent | null>(null); // For editing combined data
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create'); // For StudentProfileForm
  const [showProfileDialog, setShowProfileDialog] = useState(false); // For StudentProfileForm
  const [isLoading, setIsLoading] = useState(true);
  // studentToDelete will now refer to CombinedStudent data or at least user.uid for deleteUser cloud function
  const [studentToDelete, setStudentToDelete] = useState<{ userId: string; userName: string; profileId?: string } | null>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsersFromFirestore(db);
      const studentRoleUsers = allUsers.filter(user => user.role === 'student');
      const profiles = await getAllStudents(db); // Fetches all student profiles

      const combinedData: CombinedStudent[] = studentRoleUsers.map(user => {
        const studentProfile = profiles.find(p => p.userId === user.uid);
        return { user, profile: studentProfile };
      });

      // Identify orphaned profiles (profiles whose userId does not match any user in allUsers)
      // This is a simplified check; a more robust check might compare against allUser.uids
      const orphanedProfiles = profiles.filter(p => !allUsers.some(u => u.uid === p.userId));
      orphanedProfiles.forEach(orphan => {
        // For orphaned profiles, create a minimal User-like object for display consistency
        // or handle them differently in the UI. For this iteration, we'll add them with a flag.
        combinedData.push({
          user: { // Construct a partial User object for display
            id: orphan.userId, // Technically profile.id is the student doc id, userId is the auth link
            uid: orphan.userId,
            firstName: orphan.firstName || 'Orphaned', // Assuming Student profile has these
            lastName: orphan.lastName || 'Profile',
            email: orphan.email || 'N/A', // Assuming Student profile has email
            role: 'student', // Implied role
            studentId: orphan.id, // studentId on user obj refers to student profile doc ID
            // Fill other User fields as null/default if necessary for type consistency
            patronymic: '',
            createdAt: orphan.createdAt, // Or some default
            updatedAt: orphan.updatedAt, // Or some default
          },
          profile: orphan,
          isOrphanedProfile: true,
        });
      });
      
      setCombinedStudentData(combinedData);

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

  const handleOpenCreateProfileDialog = (user: User) => { // User for whom to create a profile
    setSelectedUserForProfile(user);
    setSelectedStudentProfileForEdit(null);
    setFormMode('create');
    setShowProfileDialog(true);
  };

    setSelectedUserForProfile(user); // This user is the one we are creating a profile for
    setSelectedStudentDataForEdit(null); // No existing combined data to edit
    setFormMode('create');
    setShowProfileDialog(true);
  };

  // This function will handle editing the StudentProfile. User editing is separate (e.g. via UserList -> UserForm)
  const handleOpenEditProfileDialog = (studentData: CombinedStudent) => {
    if (studentData.profile) {
      setSelectedUserForProfile(studentData.user); // Keep user context
      setSelectedStudentDataForEdit(studentData); // Pass the whole combined data
      setFormMode('edit');
      setShowProfileDialog(true);
    } else if (studentData.user) {
      // If there's a user but no profile, it's a "Create Profile" scenario
      toast.info('No profile found for this student. You can create one.', { duration: 4000 });
      handleOpenCreateProfileDialog(studentData.user);
    } else {
      toast.error("Cannot edit profile: No student data available.");
    }
  };
  
  // This function is removed as there's no separate "profiles list" anymore.
  // const handleOpenEditProfileDialogFromProfilesList = (profile: Student) => { ... }


  const handleFormSuccess = () => { // Callback for StudentProfileForm
    setShowProfileDialog(false);
    setSelectedUserForProfile(null);
    setSelectedStudentDataForEdit(null);
    fetchData(); 
  };

  // This needs to be re-thought. Deleting a student should delete the User and associated Student profile.
  // The `deleteUser` cloud function already handles deleting the student profile if `studentId` is on the user doc.
  const handleDeleteInitiate = (studentData: CombinedStudent) => {
    const userName = `${studentData.user.firstName} ${studentData.user.lastName}`;
    // We need the user ID to call the `deleteUser` cloud function.
    // The profileId is relevant if we were only deleting the profile, but the task is to delete the user + profile.
    setStudentToDelete({ userId: studentData.user.uid, userName, profileId: studentData.profile?.id });
  };

  const confirmDeleteUserAndProfile = async () => { // Renamed for clarity
    if (!studentToDelete) return;
    try {
      // Call the `deleteUser` cloud function, which should handle deleting 
      // the user from Auth, their user document from Firestore, and their student profile document.
      const deleteUserFunction = httpsCallable(functions, 'deleteUser'); // Ensure 'functions' is imported from firebase config
      await deleteUserFunction({ userId: studentToDelete.userId });
      
      toast.success(`User ${studentToDelete.userName} and their profile deleted successfully.`);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting user and profile:', error);
      toast.error(error.message || 'Failed to delete user and profile.');
    } finally {
      setStudentToDelete(null);
    }
  };

  const confirmDeleteOrphanedProfileOnly = async () => {
    if (!studentToDelete || !studentToDelete.profileId) {
      toast.error("No profile selected for deletion or profile ID is missing.");
      return;
    }
    try {
      // For orphaned profiles, we only delete the student profile document.
      // The user link is already considered broken or the user non-existent.
      await deleteStudentProfileInService(db, studentToDelete.profileId);
      toast.success(`Orphaned student profile for ${studentToDelete.userName} deleted.`);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting orphaned student profile:', error);
      toast.error(error.message || 'Failed to delete orphaned student profile.');
    } finally {
      setStudentToDelete(null);
    }
  };
  
  // This function can be simplified as combinedStudentData will have user info.
  // Also, it's used in the Dialog title, so ensure it handles the structure correctly.
  const getUserNameForDisplay = (targetUser?: User | null, targetProfile?: Student | null): string => {
    if (targetUser) return `${targetUser.firstName} ${targetUser.lastName}`;
    if (targetProfile) return `${targetProfile.firstName || 'Orphaned'} ${targetProfile.lastName || 'Profile'}`;
    return 'Unknown User';
  };


  // Loading state: render skeletons
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage student roles, profiles, and group assignments.
          </p>
        </header>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Unified Student List</h2>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Empty state: after loading, if no data
  if (!isLoading && combinedStudentData.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
         <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage student roles, profiles, and group assignments.
          </p>
        </header>
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Unified Student List</h2>
          <UserX2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-muted-foreground mb-4">No students found.</p>
          <p className="text-sm text-muted-foreground">
            Click the "Add New Student" button on the main "Manage Users" page to create users with the student role. 
            You can then manage their profiles here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showProfileDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedUserForProfile(null);
          setSelectedStudentDataForEdit(null);
        }
        setShowProfileDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create Student Profile' : 'Edit Student Profile'}
              {getUserNameForDisplay(selectedUserForProfile, selectedStudentDataForEdit?.profile)}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to create a new student profile.'
                : 'Update the student profile information.'}
            </DialogDescription>
          </DialogHeader>
          {( (formMode === 'create' && selectedUserForProfile) || (formMode === 'edit' && selectedStudentDataForEdit?.profile) ) && (
            <StudentProfileForm
              mode={formMode}
              userId={selectedUserForProfile?.uid || selectedStudentDataForEdit?.user.uid}
              studentProfileId={selectedStudentDataForEdit?.profile?.id}
              userName={getUserNameForDisplay(selectedUserForProfile, selectedStudentDataForEdit?.profile)}
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
                {studentToDelete.profileId && combinedStudentData.find(s => s.profile?.id === studentToDelete.profileId)?.isOrphanedProfile ?
                  `This action will delete the orphaned student profile for ${studentToDelete.userName}. This cannot be undone.` :
                  `This action will delete the user ${studentToDelete.userName} and their associated student profile (if any). This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={
                  combinedStudentData.find(s => s.profile?.id === studentToDelete.profileId)?.isOrphanedProfile ? 
                  confirmDeleteOrphanedProfileOnly : // New function for orphaned profile deletion
                  confirmDeleteUserAndProfile
                } 
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
              >
                {combinedStudentData.find(s => s.profile?.id === studentToDelete.profileId)?.isOrphanedProfile ? 'Delete Profile Only' : 'Delete User & Profile'}
              </AlertDialogAction>
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

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <UserCheck2 className="mr-3 h-6 w-6 text-primary" /> Unified Student List
        </h2>
        <div className="bg-card shadow sm:rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Profile Status</TableHead>
                <TableHead>Student Card ID</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedStudentData.map((item) => (
                <TableRow key={item.user.uid || item.profile?.id}>
                  <TableCell className="font-medium">
                    {`${item.user.firstName} ${item.user.lastName}`}
                    {item.isOrphanedProfile && <Badge variant="outline" className="ml-2 border-orange-500 text-orange-500">Orphaned</Badge>}
                  </TableCell>
                  <TableCell>{item.user.email}</TableCell>
                  <TableCell>
                    {item.profile ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Profile Linked</Badge>
                    ) : !item.isOrphanedProfile ? (
                      <Badge variant="secondary">No Profile</Badge>
                    ) : (
                       <Badge variant="outline" className="border-orange-500 text-orange-500">Orphaned</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.profile?.studentCardId || 'N/A'}</TableCell>
                  <TableCell>{item.profile?.groupId || 'N/A'}</TableCell>
                  <TableCell>
                    {item.profile?.enrollmentDate ? format(item.profile.enrollmentDate.toDate(), "PPP") : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.profile ? (
                      <Badge variant={item.profile.status === 'active' ? 'default' : 'outline'} className={
                        item.profile.status === 'active' ? 'bg-green-500 text-white' :
                        item.profile.status === 'graduated' ? 'bg-blue-500 text-white' :
                        'border-gray-500 text-gray-500'
                      }>{item.profile.status}</Badge>
                    ) : 'N/A'}
                  </TableCell>
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
                        {item.isOrphanedProfile ? (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenEditProfileDialog(item)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Orphaned Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteInitiate(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Orphaned Profile
                            </DropdownMenuItem>
                          </>
                        ) : item.profile ? (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenEditProfileDialog(item)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Student Profile
                            </DropdownMenuItem>
                            {/* TODO: Add "Edit User Details" if needed, or confirm UserForm handles enough */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteInitiate(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User & Profile
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => handleOpenCreateProfileDialog(item.user)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Profile
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ManageStudentsPage;
