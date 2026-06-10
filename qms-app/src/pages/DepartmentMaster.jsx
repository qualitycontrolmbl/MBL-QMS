import React from "react";

export default function DepartmentMaster() {
  const departments = [
    {
      category: "Non-Technical Departments",
      data: [
        ["Quality", "Quality Manager", "Quality Executive"],
        ["Human Resource", "HRM", "HRE"],
        ["Biomedical", "BME", ""],
        ["Purchase", "PM", "PU"],
        ["Maintenance", "Maintenance Engineer", ""],
        ["House Keeping", "HK Incharge", "HK Staff"],
        ["Information Technology", "IT Manager", "IT Executive"],
        ["Kitchen", "Kitchen Incharge", "Kitchen Staff"],
        ["Security", "Security Incharge", "Staff"],
      ],
    },
    {
      category: "Customer Interactive Departments",
      data: [
        ["Collection", "Incharge", "Phlebotomist"],
        ["Front Office", "Incharge", "Staff"],
        ["Back Office", "Incharge", "Staff"],
        ["Sample Collection Center", "Incharge", "Staff"],
        ["Call Center", "Incharge", "Staff"],
      ],
    },
    {
      category: "Technical Departments",
      data: [
        ["Microbiology", "HOD", "Supervisor", "Staff"],
        ["Serology", "HOD", "Supervisor", "Staff"],
        ["Histopathology & Cytopathology", "HOD", "Supervisor", "Staff"],
        ["Flow Cytometry", "HOD", "Supervisor", "Staff"],
        ["Cytogenetics", "HOD", "Supervisor", "Staff"],
        ["Biochemistry", "HOD", "Supervisor", "Staff"],
        ["Haematology", "HOD", "Supervisor", "Staff"],
        ["Clinical Pathology", "HOD", "Supervisor", "Staff"],
        ["Molecular Biology", "HOD", "Supervisor", "Staff"],
        ["Molecular Genetics", "HOD", "Supervisor", "Staff"],
      ],
    },
    {
      category: "Control Departments",
      data: [
        ["Accounts Department", "", ""],
        ["Administration", "Managing Director", "Deputy Director"],
        ["Design", "Incharge", ""],
        ["Marketing", "Manager", "Assistant Manager", "Executive"],
      ],
    },
    {
      category: "ERP Administration",
      data: [
        ["ERP", "Admin", "Assistant Admin"],
      ],
    },
  ];

  return (
    <div className="container-fluid mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">
            Department & User Structure
          </h4>
        </div>

        <div className="card-body">

          {departments.map((section, index) => (
            <div key={index} className="mb-5">

              <h5 className="bg-light p-2 border rounded">
                {section.category}
              </h5>

              <div className="table-responsive">
                <table className="table table-bordered table-striped">

                  <thead className="table-dark">
                    <tr>
                      <th width="40%">Department</th>
                      <th>User Role 1</th>
                      <th>User Role 2</th>
                      <th>User Role 3</th>
                    </tr>
                  </thead>

                  <tbody>
                    {section.data.map((row, i) => (
                      <tr key={i}>
                        <td>{row[0]}</td>
                        <td>{row[1] || "-"}</td>
                        <td>{row[2] || "-"}</td>
                        <td>{row[3] || "-"}</td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

            </div>
          ))}

        </div>
      </div>
    </div>
  );
}