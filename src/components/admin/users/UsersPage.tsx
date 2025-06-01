import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserFormDialog } from './UserFormDialog';
import { UserList } from './UserList';
import { getUsers, deleteUser, searchUsers } from '@/lib/firebaseService/userService';
import type { AppUser, UserRole, UserStatus } from '@/types/index';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'all'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot<DocumentData> | undefined>(undefined);

  const loadUsers = async (reset = false) => {
    try {
      setLoading(true);
      if (reset) {
        setHasMore(true);
        setLastDoc(undefined);
      }

      if (!hasMore) return;

      const { users: fetchedUsers, lastDoc: newLastDoc } = await getUsers({
        role: selectedRole === 'all' ? undefined : selectedRole,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        limit: 20,
        startAfterDoc: reset ? undefined : lastDoc,
      });

      setUsers(prev => reset ? fetchedUsers : [...prev, ...fetchedUsers]);
      setLastDoc(newLastDoc || undefined);
      setHasMore(fetchedUsers.length === 20);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, [selectedRole, selectedStatus]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadUsers(true);
      return;
    }

    try {
      const searchResults = await searchUsers(searchTerm);
      setUsers(searchResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      await deleteUser(user.uid);
      await loadUsers(true);
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    return matchesRole && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>Add User</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as UserStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UserList
        users={filteredUsers}
        onEdit={setEditingUser}
        onDelete={handleDelete}
      />

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => loadUsers(false)}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}

      <UserFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          loadUsers(true);
        }}
      />

      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(undefined)}
          user={editingUser}
          onSuccess={() => {
            setEditingUser(undefined);
            loadUsers(true);
          }}
        />
      )}
    </div>
  );
} 