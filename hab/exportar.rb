# Se carga con: SketchUp.exe -RubyStartup exportar.rb modelo.skp
# Recorre grupos y componentes, y por cada uno que tenga caras propias guarda
# nombre, ruta de contenedores, etiqueta, volumen (si es sólido) y su malla en metros.
require 'json'

SALIDA = File.join(File.dirname(__FILE__), 'skp.json')
LOG = File.join(File.dirname(__FILE__), 'log.txt')
M = 0.0254 # pulgadas internas -> metros

def nombre_de(e)
  n = e.name.to_s
  n = e.definition.name.to_s if n.empty?
  n
end

def recorrer(ents, tr, ruta, out)
  caras = ents.grep(Sketchup::Face)
  unless caras.empty? || ruta.empty?
    tris = []
    caras.each do |f|
      m = f.mesh(0)
      pts = (1..m.count_points).map { |i| p = m.point_at(i).transform(tr); [p.x * M, p.y * M, p.z * M].map { |v| v.round(4) } }
      m.polygons.each { |poly| tris << poly.map { |i| pts[i.abs - 1] } }
    end
    out[:mallas] << { ruta: ruta.map { |r| r[:nombre] }, capas: ruta.map { |r| r[:capa] }, tris: tris, caras: caras.size }
  end
  ents.each do |e|
    next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
    next if e.hidden?
    vol = (e.respond_to?(:manifold?) && e.manifold?) ? (e.volume * M**3).round(5) : nil
    info = { nombre: nombre_de(e), capa: e.layer.name, def: e.definition.name, vol: vol, solido: e.manifold? }
    out[:objetos] << info.merge(ruta: (ruta.map { |r| r[:nombre] } + [info[:nombre]]))
    recorrer(e.definition.entities, tr * e.transformation, ruta + [info], out)
  end
end

UI.start_timer(4, false) do
  begin
    model = Sketchup.active_model
    out = { archivo: model.path, unidades: model.options['UnitsOptions']['LengthUnit'], capas: model.layers.map(&:name), objetos: [], mallas: [] }
    recorrer(model.entities, Geom::Transformation.new, [], out)
    File.write(SALIDA, JSON.generate(out))
    File.write(LOG, "ok #{out[:objetos].size} objetos, #{out[:mallas].size} mallas\n")
  rescue => ex
    File.write(LOG, "error: #{ex.message}\n#{ex.backtrace.first(5).join("\n")}\n")
  end
  Sketchup.active_model.close(true) rescue nil
  Sketchup.quit
end
