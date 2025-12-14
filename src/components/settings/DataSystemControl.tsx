import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Trash2,
  Pencil,
  RefreshCw,
  Users,
  Database,
  AlertTriangle,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";

// Define available tables - matches supabase schema
const AVAILABLE_TABLES = [
  "mpesa_transactions",
  "profiles",
  "public_forms",
  "form_submissions",
  "review_queue",
  "labeled_dataset",
  "mobile_clients",
  "user_devices",
  "user_roles",
  "mpesa_audit",
  "mpesa_embeddings",
  "ai_processing_logs",
] as const;

type TableName = typeof AVAILABLE_TABLES[number];

interface TableRow {
  id: string;
  [key: string]: any;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function DataSystemControl() {
  // Database state
  const [selectedTable, setSelectedTable] = useState<TableName>("mpesa_transactions");
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // User management state
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [signupDisabled, setSignupDisabled] = useState(false);
  
  // Edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    destructive?: boolean;
  }>({ open: false, title: "", description: "", action: async () => {} });
  
  // Active tab within DSC
  const [activeSection, setActiveSection] = useState<"database" | "users">("database");

  // Load table data
  const loadTableData = async (table: TableName) => {
    setLoadingTable(true);
    setSelectedRows(new Set());
    try {
      // Use explicit table queries to avoid TypeScript recursion
      let data: any[] = [];
      let error: any = null;
      
      const result = await supabase
        .from(table as any)
        .select("*")
        .limit(500);
      
      data = result.data || [];
      error = result.error;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
        setTableData(data as TableRow[]);
      } else {
        setTableColumns([]);
        setTableData([]);
      }
    } catch (error: any) {
      console.error("Error loading table:", error);
      toast.error(`Failed to load ${table}: ${error.message}`);
      setTableData([]);
      setTableColumns([]);
    } finally {
      setLoadingTable(false);
    }
  };

  // Load users via edge function
  const loadUsers = async () => {
    setLoadingUsers(true);
    setSelectedUsers(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("admin-control", {
        body: { action: "list_users" },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setUsers(data.users || []);
      setSignupDisabled(data.signup_disabled || false);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error(`Failed to load users: ${error.message}`);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadTableData(selectedTable);
  }, [selectedTable]);

  useEffect(() => {
    if (activeSection === "users") {
      loadUsers();
    }
  }, [activeSection]);

  // Row selection handlers
  const toggleRowSelection = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === tableData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tableData.map((row) => row.id)));
    }
  };

  const toggleUserSelection = (id: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  // Edit handlers
  const startEdit = (row: TableRow) => {
    setEditingRow(row.id);
    setEditRowData({ ...row });
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditRowData({});
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    
    try {
      const { id, ...updateData } = editRowData;
      const { error } = await supabase
        .from(selectedTable as any)
        .update(updateData)
        .eq("id", editingRow);
      
      if (error) throw error;
      
      toast.success("Row updated successfully");
      setEditingRow(null);
      setEditRowData({});
      loadTableData(selectedTable);
    } catch (error: any) {
      console.error("Error updating row:", error);
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  // Delete handlers
  const deleteSingleRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Row deleted");
      loadTableData(selectedTable);
    } catch (error: any) {
      console.error("Error deleting row:", error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const deleteSelectedRows = async () => {
    try {
      const ids = Array.from(selectedRows);
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .in("id", ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${ids.length} rows`);
      setSelectedRows(new Set());
      loadTableData(selectedTable);
    } catch (error: any) {
      console.error("Error deleting rows:", error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const deleteAllTableData = async () => {
    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      
      if (error) throw error;
      
      toast.success(`All data in ${selectedTable} deleted`);
      loadTableData(selectedTable);
    } catch (error: any) {
      console.error("Error clearing table:", error);
      toast.error(`Failed to clear table: ${error.message}`);
    }
  };

  const deleteAllSystemData = async () => {
    try {
      for (const table of AVAILABLE_TABLES) {
        await supabase
          .from(table as any)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }
      
      toast.success("All system data deleted");
      loadTableData(selectedTable);
    } catch (error: any) {
      console.error("Error clearing system:", error);
      toast.error(`Failed to clear system: ${error.message}`);
    }
  };

  // User management via edge function
  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-control", {
        body: { action: "delete_user", user_id: userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("User deleted");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const deleteSelectedUsers = async () => {
    try {
      const ids = Array.from(selectedUsers);
      for (const id of ids) {
        const { data, error } = await supabase.functions.invoke("admin-control", {
          body: { action: "delete_user", user_id: id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      
      toast.success(`Deleted ${ids.length} users`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting users:", error);
      toast.error(`Failed to delete users: ${error.message}`);
    }
  };

  const deleteAllUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-control", {
        body: { action: "delete_all_users" },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("All users deleted");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting all users:", error);
      toast.error(`Failed to delete all users: ${error.message}`);
    }
  };

  const toggleSignup = async (disabled: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-control", {
        body: { action: "toggle_signup", disabled },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setSignupDisabled(disabled);
      toast.success(disabled ? "Signups disabled" : "Signups enabled");
    } catch (error: any) {
      console.error("Error toggling signup:", error);
      toast.error(`Failed to toggle signup: ${error.message}`);
    }
  };

  // Confirmation wrapper
  const confirmAction = (
    title: string,
    description: string,
    action: () => Promise<void>,
    destructive = true
  ) => {
    setConfirmDialog({ open: true, title, description, action, destructive });
  };

  const executeConfirmedAction = async () => {
    await confirmDialog.action();
    setConfirmDialog({ open: false, title: "", description: "", action: async () => {} });
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value).slice(0, 50) + "...";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value).slice(0, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with warning */}
      <div className="glass-card rounded-xl p-4 border-destructive/50 bg-destructive/5">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-destructive flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">Data & System Control (Admin Only)</h3>
            <p className="text-sm text-muted-foreground">
              Destructive operations. All actions require confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeSection === "database" ? "default" : "outline"}
          onClick={() => setActiveSection("database")}
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          Database
        </Button>
        <Button
          variant={activeSection === "users" ? "default" : "outline"}
          onClick={() => setActiveSection("users")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Users & Auth
        </Button>
      </div>

      {activeSection === "database" && (
        <div className="space-y-4">
          {/* Table Selection & Actions */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Label className="text-sm whitespace-nowrap">Table:</Label>
                <Select
                  value={selectedTable}
                  onValueChange={(v) => setSelectedTable(v as TableName)}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TABLES.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => loadTableData(selectedTable)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRows.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      confirmAction(
                        "Delete Selected Rows",
                        `Delete ${selectedRows.size} selected rows from ${selectedTable}?`,
                        deleteSelectedRows
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedRows.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/50"
                  onClick={() =>
                    confirmAction(
                      "Clear Table",
                      `Delete ALL data in ${selectedTable}? This cannot be undone.`,
                      deleteAllTableData
                    )
                  }
                >
                  Clear Table
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    confirmAction(
                      "SYSTEM RESET",
                      "Delete ALL data from ALL tables? This is irreversible and will completely reset the system.",
                      deleteAllSystemData
                    )
                  }
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Full Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            {loadingTable ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No data in {selectedTable}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === tableData.length && tableData.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </TableHead>
                      {tableColumns.slice(0, 6).map((col) => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(row.id)}
                            onCheckedChange={() => toggleRowSelection(row.id)}
                          />
                        </TableCell>
                        {tableColumns.slice(0, 6).map((col) => (
                          <TableCell key={col} className="text-xs max-w-[150px] truncate">
                            {editingRow === row.id ? (
                              col === "id" ? (
                                renderValue(row[col])
                              ) : (
                                <Input
                                  value={editRowData[col] ?? ""}
                                  onChange={(e) =>
                                    setEditRowData({ ...editRowData, [col]: e.target.value })
                                  }
                                  className="h-7 text-xs"
                                />
                              )
                            ) : (
                              renderValue(row[col])
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-1">
                            {editingRow === row.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={saveEdit}
                                >
                                  <Check className="h-3 w-3 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEdit(row)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() =>
                                    confirmAction(
                                      "Delete Row",
                                      "Delete this row permanently?",
                                      () => deleteSingleRow(row.id)
                                    )
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Showing first 6 columns, max 500 rows. Full data in individual table views.
          </p>
        </div>
      )}

      {activeSection === "users" && (
        <div className="space-y-4">
          {/* Signup Control */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Disable New Registrations</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent new users from signing up
                </p>
              </div>
              <Switch
                checked={signupDisabled}
                onCheckedChange={(checked) =>
                  confirmAction(
                    checked ? "Disable Signups" : "Enable Signups",
                    checked
                      ? "New users will not be able to register."
                      : "New users will be able to register.",
                    () => toggleSignup(checked),
                    false
                  )
                }
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <Button variant="ghost" size="sm" onClick={loadUsers}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <div className="flex gap-2">
                {selectedUsers.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      confirmAction(
                        "Delete Selected Users",
                        `Delete ${selectedUsers.size} selected users permanently?`,
                        deleteSelectedUsers
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedUsers.size})
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    confirmAction(
                      "DELETE ALL USERS",
                      "Delete ALL registered users? This is irreversible.",
                      deleteAllUsers
                    )
                  }
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Delete All
                </Button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No registered users
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleAllUsers}
                        />
                      </TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Created</TableHead>
                      <TableHead className="text-xs">Last Sign In</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{user.email}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() =>
                              confirmAction(
                                "Delete User",
                                `Delete user ${user.email} permanently?`,
                                () => deleteUser(user.id)
                              )
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ ...confirmDialog, open: false })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.destructive && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmedAction}
              className={confirmDialog.destructive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
