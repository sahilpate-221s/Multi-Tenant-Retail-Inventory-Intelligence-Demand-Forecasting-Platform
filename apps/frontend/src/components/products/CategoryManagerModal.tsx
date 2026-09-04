import { useState } from "react";
import { useCategories, useCreateCategory, useDeleteCategory } from "../../hooks/useProducts";

function CategoryManagerModal({ onClose }: { onClose: () => void }) {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newName, setNewName] = useState("");

  async function handleAdd() {
    if (!newName.trim()) return;
    await createCategory.mutateAsync(newName.trim());
    setNewName("");
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Manage Categories</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={createCategory.isPending}
            className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-1 max-h-64 overflow-y-auto">
          {isLoading && <li className="text-sm text-slate-400">Loading...</li>}
          {categories?.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100">
              <span>{cat.name}</span>
              <button
                onClick={() => deleteCategory.mutate(cat.id)}
                className="text-status-danger text-xs hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
          {categories?.length === 0 && !isLoading && (
            <li className="text-sm text-slate-400">No categories yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CategoryManagerModal;