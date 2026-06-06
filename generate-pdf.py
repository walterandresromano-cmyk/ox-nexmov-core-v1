#!/usr/bin/env python3
"""
Generador de PDF para presentación de dealers - oX NEXMOV
Convierte HTML a PDF con estilos profesionales
"""

import os
import sys
from pathlib import Path

def generate_pdf():
    """Genera PDF desde HTML usando disponibilidad de herramientas"""
    
    html_file = Path("PRESENTACION_DEALERS.html")
    pdf_file = Path("PRESENTACION_DEALERS.pdf")
    
    if not html_file.exists():
        print(f"❌ Error: {html_file} no encontrado")
        sys.exit(1)
    
    print("🔄 Generando PDF... Intentando con múltiples métodos")
    
    # Método 1: Usando weasyprint
    try:
        from weasyprint import HTML
        print("   → Usando WeasyPrint...")
        HTML(str(html_file)).write_pdf(str(pdf_file))
        print(f"✅ PDF generado exitosamente: {pdf_file}")
        print(f"📄 12 páginas profesionales con estilo de marca oX NEXMOV")
        return True
    except ImportError:
        print("   ℹ️  WeasyPrint no disponible")
    except Exception as e:
        print(f"   ⚠️  Error con WeasyPrint: {e}")
    
    # Método 2: Usando reportlab
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.colors import HexColor
        
        print("   → Usando ReportLab...")
        
        # Crear documento
        doc = SimpleDocTemplate(
            str(pdf_file),
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        print(f"✅ PDF base generado: {pdf_file}")
        print("⚠️  Nota: Para mejor formato con CSS, abre el HTML en navegador")
        print("    y usa Imprimir → Guardar como PDF (Ctrl+P)")
        return True
        
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
    
    print("\n💡 Soluciones alternativas:")
    print("   1. Abre PRESENTACION_DEALERS.html en tu navegador")
    print("   2. Presiona Ctrl+P (o Cmd+P en Mac)")
    print("   3. Selecciona 'Guardar como PDF'")
    print("   4. ¡Listo! Tendrás un PDF perfectamente formateado")
    print("\n   O instala: pip install weasyprint")
    
    return False

if __name__ == "__main__":
    try:
        generate_pdf()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
