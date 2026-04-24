import * as THREE from "three"

/**
 * 将 BufferGeometry（non-indexed）序列化为 VTP XML 字符串
 * 替代 vtkXMLPolyDataWriter
 *
 * 仅保留 Points + Polys，CellData（label scalars）可选导出
 */
export function geometryToVTP(
  geo: THREE.BufferGeometry,
  cellLabels?: Float32Array | null,
): string {
  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
  const normalAttr = geo.getAttribute("normal") as THREE.BufferAttribute | undefined
  const nPoints = posAttr.count
  const nPolys = nPoints / 3 // non-indexed，每 3 个顶点一个三角形

  // Points 数据
  const pointsData = Array.from(posAttr.array).join(" ")

  // Polys connectivity & offsets
  const connectivity = Array.from({ length: nPoints }, (_, i) => i).join(" ")
  const offsets = Array.from({ length: nPolys }, (_, i) => (i + 1) * 3).join(" ")

  // Normals（可选）
  let normalsSection = ""
  if (normalAttr) {
    normalsSection = `
      <PointData Normals="Normals">
        <DataArray type="Float32" Name="Normals" NumberOfComponents="3" format="ascii">
          ${Array.from(normalAttr.array).join(" ")}
        </DataArray>
      </PointData>`
  }

  // CellData（label scalars，可选）
  let cellDataSection = ""
  if (cellLabels && cellLabels.length === nPolys) {
    cellDataSection = `
      <CellData Scalars="Label">
        <DataArray type="Float32" Name="Label" NumberOfComponents="1" format="ascii">
          ${Array.from(cellLabels).join(" ")}
        </DataArray>
      </CellData>`
  }

  return `<?xml version="1.0"?>
<VTKFile type="PolyData" version="0.1" byte_order="LittleEndian">
  <PolyData>
    <Piece NumberOfPoints="${nPoints}" NumberOfPolys="${nPolys}" NumberOfVerts="0" NumberOfLines="0" NumberOfStrips="0">${normalsSection}${cellDataSection}
      <Points>
        <DataArray type="Float32" NumberOfComponents="3" format="ascii">
          ${pointsData}
        </DataArray>
      </Points>
      <Polys>
        <DataArray type="Int32" Name="connectivity" format="ascii">${connectivity}</DataArray>
        <DataArray type="Int32" Name="offsets" format="ascii">${offsets}</DataArray>
      </Polys>
    </Piece>
  </PolyData>
</VTKFile>`
}
