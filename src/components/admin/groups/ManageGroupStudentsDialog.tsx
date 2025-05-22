import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus, UserMinus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  addStudentToGroup,
  removeStudentFromGroup,
} from '@/lib/firebaseService/groupService';
import { getAllStudents as getAllStudentProfilesFromService } from '@/lib/firebaseService/studentService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Group, Student } from '@/types';
import { cn } from '@/lib/utils';
// Removed Badge as it's not used in this simplified version

interface ManageGroupStudentsDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentsManaged: () => void; // Callback to refresh group list or group details
}

interface StudentWithUserDetails extends Student {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const ManageGroupStudentsDialog: React.FC<ManageGroupStudentsDialogProps> = ({
  group,
  open,
  onOpenChange,
  onStudentsManaged,
}) => {
  const [currentStudentsDetails, setCurrentStudentsDetails] = useState<StudentWithUserDetails[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentWithUserDetails[]>([]);
  const [selectedStudentIdToAdd, setSelectedStudentIdToAdd] = useState<string>(""); // Store student profile ID
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchStudentData = useCallback(async () => {
    if (!group) return;
    setIsLoadingData(true);
    try {
      const allStudentProfiles = await getAllStudentProfilesFromService(db);
      const allUsers = await getUsersFromFirestore(db);
      const userMap = new Map(allUsers.map(u => [u.uid, u]));

      const groupStudentDetails: StudentWithUserDetails[] = [];
      if (group.students && group.students.length > 0) {
        for (const studentProfileId of group.students) {
          const profile = allStudentProfiles.find(p => p.id === studentProfileId);
          if (profile) {
            const user = userMap.get(profile.userId);
            groupStudentDetails.push({
              ...profile,
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email,
            });
          }
        }
      }
      setCurrentStudentsDetails(groupStudentDetails);

      // Available students are those whose profile ID is NOT in the current group's student list
      // AND who ideally do not have a groupId or their groupId is empty/null
      // For this version, we'll just filter out those already in THIS group.
      // A more robust system would also check student.groupId.
      const available = allStudentProfiles
        .filter(p => !group.students.includes(p.id) && (!p.groupId || p.groupId === "")) 
        .map(p => {
          const user = userMap.get(p.userId);
          return { ...p, firstName: user?.firstName, lastName: user?.lastName, email: user?.email };
        });
      setAvailableStudents(available);

    } catch (error) {
      console.error("Error fetching student data:", error);
      toast.error("Failed to load student data.");
    } finally {
      setIsLoadingData(false);
    }
  }, [group]);

  useEffect(() => {
    if (open && group) {
      fetchStudentData();
    }
  }, [open, group, fetchStudentData]);

  const handleAddStudentToGroup = async () => {
    if (!group || !selectedStudentIdToAdd) {
      toast.error("No student selected or group not found.");
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedStudent = availableStudents.find(s => s.id === selectedStudentIdToAdd);
      if (!selectedStudent) {
        throw new Error("Selected student not found");
      }
      await addStudentToGroup(db, group.id, selectedStudent.id);
      toast.success("Student added to group successfully.");
      setSelectedStudentIdToAdd(""); // Reset selection
      onStudentsManaged(); // Refresh data on the parent page
      fetchStudentData(); // Re-fetch students for this dialog
    } catch (error) {
      console.error("Error adding student to group:", error);
      toast.error("Failed to add student to group. The student might already be in another group or an error occurred.");
    } finally {
      setIsSubmitting(false);
      setPopoverOpen(false); // Close popover
    }
  };

  const handleRemoveStudentFromGroup = async (studentProfileId: string) => {
    if (!group) return;
    setIsSubmitting(true);
    try {
      await removeStudentFromGroup(db, group.id, studentProfileId);
      toast.success("Student removed from group successfully.");
      onStudentsManaged();
      fetchStudentData();
    } catch (error) {
      console.error("Error removing student from group:", error);
      toast.error("Failed to remove student from group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group) return null; // Should not happen if dialog is opened with a group

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Students for Group: {group.name}</DialogTitle>
          <DialogDescription>
            Add or remove students from this group. Students are expected to belong to only one group.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Add Student to Group</h3>
          <div className="flex items-center space-x-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full sm:w-[300px] justify-between"
                  disabled={isLoadingData || availableStudents.length === 0}
                >
                  {selectedStudentIdToAdd && availableStudents.find(s => s.id === selectedStudentIdToAdd)
                    ? `${availableStudents.find(s => s.id === selectedStudentIdToAdd)?.firstName} ${availableStudents.find(s => s.id === selectedStudentIdToAdd)?.lastName} (${availableStudents.find(s => s.id === selectedStudentIdToAdd)?.studentCardId})`
                    : "Select student..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command>
                  <CommandInput placeholder="Search student by Card ID or Name..." />
                  <CommandList>
                    <CommandEmpty>{isLoadingData ? "Loading..." : "No available students found."}</CommandEmpty>
                    <CommandGroup>
                      {availableStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={`${student.studentCardId} ${student.firstName} ${student.lastName}`}
                          onSelect={() => {
                            setSelectedStudentIdToAdd(student.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudentIdToAdd === student.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {student.firstName} {student.lastName} ({student.studentCardId})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddStudentToGroup} disabled={!selectedStudentIdToAdd || isSubmitting || isLoadingData}>
              <UserPlus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
           {availableStudents.length === 0 && !isLoadingData && <p className="text-sm text-muted-foreground mt-2">No students available to add (they might already be in a group).</p>}
        </div>

        <div className="mt-6 flex-grow overflow-hidden">
          <h3 className="text-md font-medium mb-2">Current Students in Group ({currentStudentsDetails.length})</h3>
          {isLoadingData && <p>Loading students...</p>}
          {!isLoadingData && currentStudentsDetails.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No students currently in this group.</p>
          )}
          {!isLoadingData && currentStudentsDetails.length > 0 && (
            <ScrollArea className="h-[calc(100%-40px)] pr-3"> {/* Adjust height based on surrounding elements */}
              <ul className="space-y-1">
                {currentStudentsDetails.map(student => (
                  <li key={student.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md text-sm">
                    <div>
                      <span className="font-medium">{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-muted-foreground ml-2">({student.studentCardId})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStudentFromGroup(student.id)}
                      disabled={isSubmitting}
                      className="text-red-500 hover:text-red-600 h-7 w-7"
                    >
                      <UserMinus className="h-4 w-4" />
                       <span className="sr-only">Remove student</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageGroupStudentsDialog;
