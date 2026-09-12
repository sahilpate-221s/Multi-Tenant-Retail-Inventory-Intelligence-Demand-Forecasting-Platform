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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-sm p-5 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="font-bold text-sm text-[#e8e6e3]">Product Categories</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={createCategory.isPending}
            className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold px-3 py-2 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-1 max-h-64 overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)]">
          {isLoading && <li className="text-[#97979d] py-2">Loading categories...</li>}
          {categories?.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between py-2 text-[#e8e6e3]">
              <span>{cat.name}</span>
              <button
                onClick={() => deleteCategory.mutate(cat.id)}
                className="text-[#d45a4a] hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
          {categories?.length === 0 && !isLoading && (
            <li className="text-[#5c5c64] py-2">No categories defined yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CategoryManagerModal;