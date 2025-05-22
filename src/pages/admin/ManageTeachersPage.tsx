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


import { httpsCallable } from 'firebase/functions'; // Import for cloud functions
import { functions } from '@/lib/firebase'; // Your firebase functions instance
import { doc } from 'firebase/firestore'; // Import doc for confirmDeleteOrphanedProfileOnly

interface CombinedTeacher {
  user: User;
  profile?: Teacher;
  isOrphanedProfile?: boolean;
}

const ManageTeachersPage: React.FC = () => {
  const [combinedTeacherData, setCombinedTeacherData] = useState<CombinedTeacher[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null); // For creating a profile for a user
  const [selectedTeacherDataForEdit, setSelectedTeacherDataForEdit] = useState<CombinedTeacher | null>(null); // For editing
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherToDelete, setTeacherToDelete] = useState<{ userId: string; userName: string; profileId?: string; isOrphaned: boolean } | null>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsersFromFirestore(db);
      const teacherRoleUsers = allUsers.filter(user => user.role === 'teacher');
      const profiles = await getAllTeachers(db);

      const combinedData: CombinedTeacher[] = teacherRoleUsers.map(user => {
        const teacherProfile = profiles.find(p => p.userId === user.uid);
        return { user, profile: teacherProfile, isOrphanedProfile: false };
      });

      const orphanedProfiles = profiles.filter(p => !allUsers.some(u => u.uid === p.userId));
      orphanedProfiles.forEach(orphan => {
        combinedData.push({
          user: { // Partial User for display
            id: orphan.userId, 
            uid: orphan.userId,
            firstName: orphan.firstName || 'Orphaned',
            lastName: orphan.lastName || 'Profile',
            email: orphan.email || 'N/A',
            role: 'teacher',
            teacherId: orphan.id,
            patronymic: '', createdAt: orphan.createdAt, updatedAt: orphan.updatedAt,
          },
          profile: orphan,
          isOrphanedProfile: true,
        });
      });
      
      setCombinedTeacherData(combinedData);

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
    setSelectedTeacherDataForEdit(null);
    setFormMode('create');
    setShowProfileDialog(true);
  };
  
  const handleOpenEditProfileDialog = (teacherData: CombinedTeacher) => {
    if (teacherData.profile) {
      setSelectedUserForProfile(teacherData.user); // User context
      setSelectedTeacherDataForEdit(teacherData);
      setFormMode('edit');
      setShowProfileDialog(true);
    } else if (teacherData.user && !teacherData.isOrphanedProfile) {
      // User exists but no profile, and not an orphaned profile scenario
      toast.info('No profile found for this teacher. You can create one.', { duration: 4000 });
      handleOpenCreateProfileDialog(teacherData.user);
    } else {
      // Orphaned profile without a full user record - still allow editing profile
      setSelectedUserForProfile(null); // No full user record to pass
      setSelectedTeacherDataForEdit(teacherData);
      setFormMode('edit');
      setShowProfileDialog(true);
    }
  };

  // Removed handleOpenEditProfileDialogFromProfilesList as it's redundant with the unified list

  const handleFormSuccess = () => {
    setShowProfileDialog(false);
    setSelectedUserForProfile(null);
    setSelectedTeacherDataForEdit(null);
    fetchData(); 
  };

  const handleDeleteInitiate = (teacherData: CombinedTeacher) => {
    const userName = `${teacherData.user.firstName} ${teacherData.user.lastName}`;
    setTeacherToDelete({ 
      userId: teacherData.user.uid, 
      userName, 
      profileId: teacherData.profile?.id,
      isOrphaned: !!teacherData.isOrphanedProfile 
    });
  };

  const confirmDeleteUserAndProfile = async () => {
    if (!teacherToDelete || teacherToDelete.isOrphaned) return; // Should not be called for orphaned
    try {
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      await deleteUserFunction({ userId: teacherToDelete.userId });
      toast.success(`User ${teacherToDelete.userName} and their profile deleted successfully.`);
      fetchData(); 
    } catch (error: any) {
      console.error('Error deleting user and profile:', error);
      toast.error(error.message || 'Failed to delete user and profile.');
    } finally {
      setTeacherToDelete(null);
    }
  };

  const confirmDeleteOrphanedProfileOnly = async () => {
    if (!teacherToDelete || !teacherToDelete.profileId || !teacherToDelete.isOrphaned) return;
    try {
      await deleteTeacherProfileInService(db, teacherToDelete.profileId);
      // No user document update needed for orphaned profiles
      toast.success(`Orphaned teacher profile for ${teacherToDelete.userName} deleted.`);
      fetchData(); 
    } catch (error) {
      console.error('Error deleting orphaned teacher profile:', error);
      toast.error('Failed to delete orphaned teacher profile.');
    } finally {
      setTeacherToDelete(null);
    }
  };

  const getUserNameForDisplay = (targetUser?: User | null, targetProfile?: Teacher | null): string => {
    if (targetUser && targetUser.firstName !== 'Orphaned') return `${targetUser.firstName} ${targetUser.lastName}`; // Prioritize full user name
    if (targetProfile) return `${targetProfile.firstName || 'Orphaned'} ${targetProfile.lastName || 'Profile'}`; // Fallback to profile name
    return 'Unknown User';
  };
  
  if (isLoading && combinedTeacherData.length === 0) { // Updated loading condition
    return <p className="text-center p-10">Loading teacher data...</p>; // Generic loading message
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showProfileDialog} onOpenChange={(open) => {
        if (!open) { 
          setSelectedUserForProfile(null);
          setSelectedTeacherDataForEdit(null);
        }
        setShowProfileDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create Teacher Profile' : 'Edit Teacher Profile'}
              {getUserNameForDisplay(selectedUserForProfile, selectedTeacherDataForEdit?.profile)}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to create a new teacher profile.'
                : 'Update the teacher profile information.'}
            </DialogDescription>
          </DialogHeader>
          {/* Ensure form is rendered only when necessary data is available */}
          {( (formMode === 'create' && selectedUserForProfile) || (formMode === 'edit' && selectedTeacherDataForEdit?.profile) ) && (
            <TeacherProfileForm
              mode={formMode}
              userId={selectedUserForProfile?.uid || selectedTeacherDataForEdit?.user.uid} 
              teacherProfileId={selectedTeacherDataForEdit?.profile?.id} 
              userName={getUserNameForDisplay(selectedUserForProfile, selectedTeacherDataForEdit?.profile)}
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
                {teacherToDelete.isOrphaned ?
                  `This action will delete the orphaned teacher profile for ${teacherToDelete.userName}. This cannot be undone.` :
                  `This action will delete the user ${teacherToDelete.userName} and their associated teacher profile (if any). This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={teacherToDelete.isOrphaned ? confirmDeleteOrphanedProfileOnly : confirmDeleteUserAndProfile} 
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
              >
                {teacherToDelete.isOrphaned ? 'Delete Profile Only' : 'Delete User & Profile'}
              </AlertDialogAction>
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
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <UserCheck2 className="mr-3 h-6 w-6 text-primary" /> Unified Teacher List
        </h2>
        <div className="bg-card shadow sm:rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Profile Status</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Education</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedTeacherData.map((item) => (
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
                  <TableCell>{item.profile?.specialization || 'N/A'}</TableCell>
                  <TableCell>{item.profile?.experience !== undefined ? `${item.profile.experience} yrs` : 'N/A'}</TableCell>
                  <TableCell className="truncate max-w-xs" title={item.profile?.education || ''}>{item.profile?.education || 'N/A'}</TableCell>
                  <TableCell>{item.profile?.subjects?.length || 0}</TableCell>
                  <TableCell>{item.profile?.groups?.length || 0}</TableCell>
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
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Teacher Profile
                            </DropdownMenuItem>
                            {/* Note: Editing User details (name, email, role) is via UserList/UserForm */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteInitiate(item)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User & Profile
                            </DropdownMenuItem>
                          </>
                        ) : ( // User exists, but no profile
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

export default ManageTeachersPage;
