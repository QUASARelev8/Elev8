import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";

const BilliardTable = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    table_name: "",
  });
  const [originalTableName, setOriginalTableName] = useState("");

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      console.log("Fetching billiard tables from Supabase...");

      const { data, error } = await supabase
        .from("billiard_table")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Supabase Response:", { data, error });
      console.log("Number of tables:", data?.length);

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      setTables(data || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to fetch billiard tables",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.table_name.trim()) {
    Swal.fire({
      icon: "warning",
      title: "Required Field",
      text: "Table name is required",
    });
    return;
  }

  try {
    if (editMode && currentTable) {
      // ✅ Update - Build update object carefully
      const updateData = {
        table_name: formData.table_name,
      };

      // ✅ Only update image if a new one was uploaded
      if (imageBase64) {
        updateData.table_image = imageBase64;
      }
      // If no new image uploaded, keep existing image (don't include in update)

      // ✅ Only set previous_table_name if the name actually changed
      if (formData.table_name !== originalTableName) {
        updateData.previous_table_name = originalTableName;
      }

      console.log("Updating table:", currentTable.table_id);
      console.log("Update data:", updateData);

      const { error } = await supabase
        .from("billiard_table")
        .update(updateData)
        .eq("table_id", currentTable.table_id);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "Billiard table updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // ✅ Insert - Add new table
      const insertData = {
        table_name: formData.table_name,
      };

      // Only add image if one was uploaded
      if (imageBase64) {
        insertData.table_image = imageBase64;
      }

      console.log("Inserting new table:", insertData);

      const { error } = await supabase
        .from("billiard_table")
        .insert([insertData]);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Billiard table added successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    }

    handleCloseModal();
    fetchTables();
  } catch (error) {
    console.error("Error saving table:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message || "Failed to save billiard table",
    });
  }
};

const handleEdit = (table) => {
  setCurrentTable(table);
  setOriginalTableName(table.table_name); // ✅ Store original name
  setFormData({
    table_name: table.table_name || "",
  });
  // ✅ Clear image states when editing (will keep existing image if not changed)
  setImageBase64("");
  setImageFile(null);
  setEditMode(true);
  setShowModal(true);
};
  const handleDelete = async (id, tableName) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete table "${tableName}"? This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("billiard_table")
          .delete()
          .eq("table_id", id);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Billiard table has been deleted.",
          timer: 1500,
          showConfirmButton: false,
        });

        fetchTables();
      } catch (error) {
        console.error("Error deleting table:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to delete billiard table",
        });
      }
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentTable(null);
    setOriginalTableName(""); // ✅ Reset original name
    setFormData({
      table_name: "",
    });
    setImageFile(null);
    setImageBase64("");
  };

  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result); // Base64 data
      };
      reader.readAsDataURL(file); // ← convert to Base64
    }
  };

  // Filter tables based on search
  const filteredTables = tables.filter((table) =>
    table.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #28a745",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          ></div>
          <p style={{ marginTop: "15px", color: "#666" }}>Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: "700",
              color: "#333",
            }}
          >
            Billiard Tables
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
            Total: {tables.length} table{tables.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 5px rgba(40,167,69,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#218838";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(40,167,69,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#28a745";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 5px rgba(40,167,69,0.3)";
          }}
        >
          <Plus size={18} />
          Add Table
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            position: "relative",
            maxWidth: "400px",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#999",
            }}
          />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 40px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#28a745")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
          />
        </div>
      </div>

      {/* Tables Grid/List */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #dee2e6",
                }}
              >
                <th
                  style={{
                    padding: "15px",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Table Name
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Previous Name
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Created
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Image
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
<tbody>
  {filteredTables.length === 0 ? (
    <tr>
      <td colSpan="5" style={{
        textAlign: 'center',
        padding: '50px',
        color: '#999',
        fontSize: '14px'
      }}>
        {searchTerm ? 'No tables match your search' : 'No tables found. Click "Add Table" to create one.'}
      </td>
    </tr>
  ) : (
    filteredTables.map((table) => (
      <tr
        key={table.table_id}
        style={{ borderBottom: '1px solid #f0f0f0' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        <td style={{ padding: '15px' }}>
          <strong style={{ color: '#333' }}>{table.table_name}</strong>
        </td>
        
        {/* ✅ NEW: Previous Name Column */}
        <td style={{ padding: '15px' }}>
          {table.previous_table_name ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#856404'
            }}>
              <span>📝</span>
              <span style={{ fontWeight: '600' }}>{table.previous_table_name}</span>
            </div>
          ) : (
            <span style={{ color: '#999', fontSize: '13px' }}>—</span>
          )}
        </td>
        
        <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
          {table.created_at ? new Date(table.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : '-'}
        </td>
        <td style={{ padding: "15px", textAlign: "center" }}>
          {table.table_image ? (
            <img
              src={table.table_image}
              alt={table.table_name}
              style={{ width: "80px", height: "60px", borderRadius: "6px", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#999" }}>No Image</span>
          )}
        </td>
        <td style={{ padding: '15px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => handleEdit(table)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ffc107',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#e0a800';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffc107';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => handleDelete(table.table_id, table.table_name)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#c82333';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#dc3545';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </td>
      </tr>
    ))
  )}
</tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#333",
                }}
              >
                {editMode ? "Edit Billiard Table" : "Add New Table"}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  display: "flex",
                  alignItems: "center",
                  color: "#666",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#333")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {editMode && currentTable && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                    border: "1px solid #dee2e6",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      fontWeight: "600",
                    }}
                  >
                    Table Code:
                  </span>
                  <span
                    style={{
                      marginLeft: "10px",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#28a745",
                    }}
                  >
                    {currentTable.table_code}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#333",
                    fontSize: "14px",
                  }}
                >
                  Table Name <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text"
                  name="table_name"
                  value={formData.table_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Table 1, VIP Table, etc."
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#28a745")
                  }
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
                />

                {/* ✅ ADD THIS: Show previous name if editing and name changed */}
                {editMode &&
                  originalTableName &&
                  formData.table_name !== originalTableName && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px 12px",
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>ℹ️</span>
                      <div style={{ fontSize: "13px", color: "#856404" }}>
                        <strong>Previous name:</strong> {originalTableName}
                      </div>
                    </div>
                  )}

                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginTop: "5px",
                    marginBottom: 0,
                  }}
                >
                  💡 Table code will be auto-generated
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    fontWeight: "600",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Table Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    width: "100%",
                  }}
                />

                {imageBase64 || (editMode && currentTable?.table_image) ? (
                  <img
                    src={imageBase64 || currentTable.table_image}
                    alt="Preview"
                    style={{
                      marginTop: "10px",
                      width: "100%",
                      maxHeight: "250px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                ) : null}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  paddingTop: "20px",
                  borderTop: "1px solid #dee2e6",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#5a6268")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#6c757d")
                  }
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#218838")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#28a745")
                  }
                >
                  {editMode ? "Update Table" : "Add Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default BilliardTable;
