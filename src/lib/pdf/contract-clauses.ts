// Texto fijo de las Condiciones Generales del contrato marco de arriendo de
// SOLTERRA SPA. Transcrito de docs/contrato-marco.txt — es texto legal del
// cliente: NO modificar el contenido. El único token reemplazable es
// {{VIGENCIA}} (cláusula primera), que el template sustituye por la vigencia
// del contrato (o "2 años" por defecto).

export interface ClausulaTabla {
  titulo: string;
  headers: string[];
  filas: string[][];
}

export interface ClausulaBancoItem {
  label: string;
  valor: string;
}

export interface ClausulaBloque {
  titulo: string;
  parrafos: string[];
  // Render estructurado opcional (mismo contenido legal, mejor formato en PDF).
  tabla?: ClausulaTabla;
  bancoDetalle?: ClausulaBancoItem[];
}

export const CONDICIONES_GENERALES: ClausulaBloque[] = [
  {
    titulo: "CLÁUSULA PRIMERA: ARRENDAMIENTO Y VIGENCIA.",
    parrafos: [
      "Las partes acuerdan en este acto establecer los términos y condiciones generales que en virtud del cual la Arrendadora entregará a la Arrendataria, durante la vigencia del Contrato, uno o más bienes muebles (Equipo) que se individualizarán en uno o más anexos denominados “Condiciones Particulares, que formarán parte del presente Contrato en el cual se detallarán los términos y condiciones específicos, tanto técnicas como comerciales, tales como identificación de los equipos, plazos de arriendo, lugar de operación, tarifas de arrendamiento, horas mínimas pactadas, horas para mantención, entre otras.",
      "En este acto, la Arrendataria reconoce y acepta que los anexos denominados “Condiciones Particulares” podrán ser suscritos únicamente por las personas que expresamente se individualizan” en el presente contrato y que obligarán a la propia Arrendataria en todas sus partes. Cualquier cambio de estas personas autorizadas para representar a la Arrendataria, deberá ser informado de manera expresa a la Arrendadora y se deberá suscribir documento denominado Modificación de Anexo B “de Representantes de la Arrendataria” que reemplazará íntegramente el encabezado del presente contrato pag.1 haciendo valer su modificación en el tenor de sus representantes actuales. Mientras la Arrendataria no notifique por escrito a la Arrendadora el cambio de algún representante ésta seguirá siendo plenamente responsable de los actos ejecutados por éstos.",
      "El presente Contrato marco tendrá una vigencia de {{VIGENCIA}} contados desde esta fecha.",
    ],
  },
  {
    titulo: "CLÁUSULA SEGUNDA: HORÓMETRO.",
    parrafos: [
      "El Equipo incluye un dispositivo denominado “horómetro”, además de sistema de monitoreo denominado GPS, los que se entregan en perfecto estado de funcionamiento y que permite determinar la cantidad de horas utilizadas del Equipo en un periodo de tiempo determinado. La hora del horómetro del Equipo al momento de entrega y devolución (restitución), será el que se registre en la respectiva Acta de Entrega y Recepción.",
      "La Arrendataria se obliga a permitir en todo momento el acceso del personal de la Arrendadora al Equipo, con la finalidad de realizar la lectura del horómetro, verificar su buen funcionamiento y la correcta operación del mismo. Dicha lectura se llevará a cabo dentro del horario de funcionamiento de la Arrendataria. En caso de cualquier desperfecto del horómetro, sistema GPS, la Arrendataria se obliga a:",
      "a) Comunicar cualquier desperfecto, falla o mal funcionamiento del horómetro, como también del sistema GPS a más tardar dentro del plazo de 12 horas contados desde la ocurrencia del mismo.",
      "b) Paralizar el Equipo ni bien se registre la falla con el objeto de que la Arrendadora lo someta a las evaluaciones y/o reparaciones que correspondan.",
      "c) Facilitar el acceso al personal de la Arrendadora al sitio donde se encuentre el Equipo para su revisión y/o reparación, según corresponda.",
      "El hecho de no cumplir con las obligaciones indicadas precedentemente, se entenderá que la Arrendataria incumplió gravemente el Contrato.",
      "En caso que se detecte que el horómetro, o cualquiera de sus sistemas, fueron adulterados o su sello tiene signos de adulteración la determinación total de las horas a pagar se hará presumiendo que el Equipo ha sido utilizado durante las 24 horas del día y durante todos los días contados desde la fecha de la última lectura que se hubiera hecho del horómetro. Se aplicará lo mismo, para el caso de que el horómetro muestre huellas de violación, descompostura intencional o actos de vandalismo.",
      "Sin perjuicio de lo expuesto, la Arrendataria se obliga a comunicar semanalmente la lectura del horómetro a la Arrendadora.",
    ],
  },
  {
    titulo: "CLÁUSULA TERCERA: RENTA DE ARRENDAMIENTO.",
    parrafos: [
      "Renta de Arrendamiento: Es el producto de la suma de las Horas Mínimas Pactadas y Horas Extras registradas por horómetro en un mes multiplicadas por la(s) tarifa(s) de arriendo por hora, respectiva(s) a cada modelo de equipo, estipulada(s) en el punto 4 del Anexo “Condiciones Particulares”.",
      "La definición de Horas Mínimas y Horas Extras se expresa a continuación:",
      "a) Horas Mínimas Pactadas: son una cantidad de horas mínimas mensuales garantizadas cuya cantidad y valor las partes pactan en el punto 4 de las Condiciones Particulares del Contrato por el respectivo Equipo. Estas horas se deberán pagar a todo evento, de manera mensual y durante todo el plazo de arrendamiento del Equipo, independientemente de que el Equipo sea o no utilizado por la Arrendataria. Bajo ninguna circunstancia se podrán descontar las horas no utilizadas del Equipo.",
      "b) Horas Extras: es el número de horas de utilización del Equipo superior a las Horas Mínimas Pactadas, dentro del mes respectivo. El valor de cada Hora Extra (Tarifa Hora Extra) será aquella que es indicada en las Condiciones Particulares.",
      "c) Horas Disponibles: son las horas que el Equipo fue utilizado y que indicará la lectura del horómetro o, en su defecto a lo que indique el sistema GPS instalado en el Equipo. Para calcular las Horas Disponibles, se deberá realizar el siguiente cálculo:",
      "• Primer mes de arriendo: al número de horas que indique el horómetro el día de la lectura se le descontará el número de horas establecido en el Acta de Entrega y Recepción. El resultado corresponderá al número de Horas Disponibles.",
      "• A contar del segundo mes de arriendo: las Horas Disponibles serán la diferencia que exista entre la lectura actual con la del mes anterior, y así sucesivamente.",
      "En caso que las Horas Disponibles sean inferiores a las Horas Mínimas Pactadas, la Arrendataria pagará solamente la cantidad de Horas Mínimas Pactadas. En caso que las Horas Disponibles sean superiores a las Horas Mínimas Pactadas, la Arrendataria pagará las Horas Mínimas Pactadas más las Horas Extras de acuerdo a lo señalado en el párrafo primero.",
    ],
  },
  {
    titulo: "CLÁUSULA CUARTA: INCUMPLIMIENTOS.",
    parrafos: [
      "El simple retardo de la Arrendataria respecto de los pagos de las Rentas de Arrendamiento a que está obligada, hará devengar, a título de pena moratoria, el interés máximo convencional que la ley permite estipular para operaciones reajustables o no reajustables, según sea el caso, sobre el total de la obligación insoluta, desde la fecha de la mora o simple retardo y hasta la fecha de su pago efectivo. Para efectos de dar cumplimiento a lo dispuesto en la Ley 19.628, la Arrendataria otorga autorización a la Arrendadora para solicitar la publicación de su información o datos personales respecto a morosidades de rentas, documentos impagos, facturas u otros, relativas al presente Contrato, en un sistema consolidado de morosidades de información pública perteneciente a la empresa DICOM EQUIFAX u otra y la comunicación o transmisión de estos datos a terceros. Los gastos que esta gestión ocasione por su inclusión y posterior eliminación de dicha base de datos serán de cargo de la Arrendataria.",
      "En caso de devolución del Equipo por decisión de la Arrendataria, antes del plazo estipulado en el punto 2 de las Condiciones Particulares y/o sus modificaciones, ésta deberá pagar una multa de salida o término anticipado del arriendo según se detalla en la tabla N°1 siguiente:",
      "En relación a esta multa, la Arrendadora podrá facturarla sin necesidad de autorización previa de la Arrendataria.",
    ],
    tabla: {
      titulo: "Tabla N°1: Multa por Equipo por no cumplimiento del plazo del arriendo",
      headers: ["Plazo de Arriendo", "Tarifa"],
      filas: [
        ["1 a 3 meses", "96 hrs x Tarifa Equipo / hr"],
        ["4 a 6 meses", "144 hrs x Tarifa Equipo / hr"],
      ],
    },
  },
  {
    titulo: "CLÁUSULA QUINTA: FORMA DE PAGO.",
    parrafos: [
      "La Arrendataria pagará la Renta de Arrendamiento del Equipo en períodos mensuales, o fracción de mes en caso que aplique, según la condición acordada en el punto 6 de las Condiciones Particulares, ya sea modalidad de plazo vencido o anticipado, según fecha de Estado de Pago acordada en punto 6 de las Condiciones Particulares.",
      "Para aquellos casos donde la condición de pago es vencida o anticipada, la Arrendadora procederá a facturar una vez cumplido el mes correspondiente de arriendo de manera vencida o anticipada, según corresponda. Para aquellos contratos con Estado de Pago con fecha acordada de vencimiento, la Arrendadora enviará el Estado de Pago en el plazo de 5 días hábiles siguientes al cierre de mes. Posteriormente la Arrendataria tendrá un plazo de 5 días hábiles para revisar el Estado de Pago, en caso de no realizar observaciones dentro de dicho plazo, se entenderá aceptado el Estado de Pago y, la Arrendadora procederá a emitir la factura correspondiente. En caso que la Arrendataria realizare observaciones al Estado de Pago dentro de plazo, las partes deberán resolverlas en el plazo de 5 días hábiles siguientes para posteriormente proceder a facturar el Estado de Pago conciliado por parte de la Arrendadora. La Arrendataria tendrá un plazo de 8 días corridos, contados desde la recepción de la factura, para solicitar la nota de crédito o reclamar del contenido de la factura. Vencido este plazo la Arrendataria no podrá reclamar por ningún concepto el crédito que consta en la factura respectiva.",
      "La Renta de Arrendamiento se deberá pagar dentro del plazo de 30 días corridos contados desde la recepción de la factura, ya sea en el domicilio de la Arrendadora señalado en el presente Contrato o a través de depósito en efectivo o transferencia electrónica bancaria a la cuenta corriente de la Arrendadora, según el siguiente detalle:",
    ],
    bancoDetalle: [
      { label: "Titular", valor: "SOLTERRA SPA" },
      { label: "RUT", valor: "76.021.667-4" },
      { label: "N° Cuenta", valor: "21643351" },
      { label: "Banco", valor: "BCI" },
    ],
  },
  {
    titulo: "CLÁUSULA SEXTA: ENTREGA.",
    parrafos: [
      "La entrega del Equipo se hará en el lugar señalado en el punto 3 de las Condiciones Particulares. Al momento de la entrega del Equipo se deberá dejar constancia del estado y las condiciones del mismo en un documento denominado “Acta de entrega (Check List)”, el cual, una vez firmada por quien retira el Equipo se entenderá formar parte integrante del presente Contrato.",
      "La sola firma del Acta de Entrega y Recepción por la persona que recibe el Equipo en el lugar señalado en las Condiciones Particulares, ya sea que se trate de la Arrendataria, de sus representantes legales, trabajadores o incluso por el transportista contratado para tal efecto, implicará que el Equipo fue entregado en perfectas condiciones de funcionamiento con excepción de las observaciones que puedan constar en la respectiva Acta de Entrega y Recepción.",
      "El traslado del Equipo al momento de la entrega y devolución, desde y hacia las instalaciones de la Arrendadora serán de cargo y costo de la Arrendataria.",
    ],
  },
  {
    titulo: "CLÁUSULA SÉPTIMA: OBLIGACIONES DE USO, LUGAR DE DESTINO Y MODIFICACIONES A LOS EQUIPOS.",
    parrafos: [
      "La Arrendataria dará estricto cumplimiento a las condiciones de operación recomendadas por el fabricante y/o la Arrendadora, de acuerdo a las capacidades del respectivo Equipo, no pudiendo intervenir ni modificar las características ni especificaciones técnicas de los mismos ni superar las capacidades de trabajo de éstos. Las especificaciones, modos de uso, cuidados, mantenimiento y otros, se indican en los instructivos técnicos entregados por la Arrendadora que se entienden conocidos por la Arrendataria. En caso que la Arrendataria infrinja la obligación descrita en el párrafo anterior, la Arrendadora se reserva el derecho de aplicar retroactivamente un incremento del 50% sobre la tarifa pactada de arriendo del Equipo, por los meses transcurridos de arriendo, siendo la Arrendataria responsable de todos perjuicios o daños consecuenciales del equipo y/o sus componentes incluyendo la pérdida de rendimiento productivo, desgaste prematuro y/o excesivo de éstos.",
      "Salvo que medie autorización previa y por escrito de la Arrendadora, la Arrendataria usará el Equipo únicamente en el lugar indicado en el punto 3 de las Condiciones Particulares y le queda expresamente prohibido trasladar el Equipo a un lugar distinto del señalado como también utilizar el mismo en trabajos distintos a los señalados en las Condiciones Particulares. Asimismo, la Arrendataria se obliga a operar el Equipo con personal idóneo y calificado, con todos sus documentos al día, entre ellos, licencia de conducir competente y al día y/o certificación del personal para operar el Equipo de acuerdo a la legislación y normativa vigente.",
      "Asimismo, se encuentra terminantemente prohibido que se intervenga carrocería, chasis, u otros componentes o sistemas propios o accesorios del Equipo. La Arrendataria solo podrá, previa solicitud y autorización por escrito de la Arrendadora, realizar modificaciones mínimas, tales como cintas reflectantes, láminas de seguridad, adhesivos u otros de similar naturaleza que expresamente queden autorizadas. En caso de incumplimiento, la Arrendataria responderá por cualquier daño o perjuicio.",
    ],
  },
  {
    titulo: "CLÁUSULA OCTAVA: DOMINIO.",
    parrafos: [
      "Las partes dejan constancia que la propiedad del Equipo corresponde a la Arrendadora, y el uso en las condiciones establecidas en este Contrato, a la Arrendataria. En los supuestos de que se pretenda practicar embargo, secuestro, comiso u otros actos de autoridad sobre el Equipo, la Arrendataria se obliga a comunicar inmediatamente de ocurrida dicha situación, verbalmente y por escrito a la Arrendadora y ejercitará, a su cargo, cuantas reclamaciones fueren procedentes para acreditar la propiedad de la Arrendadora sobre el Equipo. La Arrendadora estará facultada para adherir al Equipo placas, etiquetas, letras de golpe u otras marcas que indiquen que el Equipo es de su propiedad, sin que la Arrendataria pueda retirarlas bajo ninguna circunstancia. Queda expresamente prohibido, sin el consentimiento previo y por escrito de la Arrendadora, la ejecución por parte de la Arrendataria de uno cualquiera de los siguientes actos en relación con el Equipo:",
      "a) Introducirle modificaciones, mejoras o alteraciones de cualquier clase en su estructura o funcionamiento.",
      "b) Variar o alterar el destino, ubicación y elementos identificatorios.",
      "c) Subarrendarlo, constituir cualquier derecho sobre el mismo a favor de terceros, ceder de cualquier forma su goce o tenencia y ceder los derechos que para ella emanan del presente Contrato.",
      "El ejercicio de cualquier acción en contra de la Arrendataria jamás puede implicar la retención del Equipo. En el evento de ser retenido el Equipo por la autoridad o cualquier tercero, a consecuencia de cualquier perjuicio o daño causado que sea responsabilidad de la Arrendataria, todo el tiempo de retención será considerado como usado por la Arrendataria y devengará las correspondientes rentas de arrendamiento descrita en el párrafo anterior. La Arrendadora se reserva el derecho de aplicar retroactivamente un incremento del 50% sobre la tarifa pactada de arriendo del Equipo, por los meses transcurridos de arriendo, siendo la Arrendataria responsable de todos los perjuicios o daños consecuenciales del equipo y/o sus componentes incluyendo la pérdida de rendimiento productivo, desgaste prematuro y/o excesivo de éstos.",
    ],
  },
  {
    titulo: "CLÁUSULA NOVENA: SEGURO.",
    parrafos: [
      "La Arrendadora tiene contratado un seguro que cubre los daños propios del Equipo y cualquier daño que con él se cause a terceros, tanto en su persona o bienes. En caso que el Equipo sufra algún siniestro de los que estén cubiertos por el seguro referido, la Arrendataria se obliga a pagarle a la Arrendadora el importe del deducible vigente al momento del siniestro, tanto respecto de daños propios como por daños a terceros.",
      "En caso que el Equipo sufra algún siniestro de los que no están cubiertos por el seguro referido, o el daño provocado sea mayor que el monto que cubre el seguro, la Arrendataria se obliga a pagar a la Arrendadora ya sea el importe de la reparación y/o su valor comercial.",
      "La Arrendataria tendrá el deber de custodia del Equipo entregado en arrendamiento por todo el tiempo de duración del mismo, respondiendo de culpa levísima en el cumplimiento de dicha obligación. Por lo tanto, en los casos en que se incumpla la obligación de custodia, tales como hurto, extravío, pérdida inexplicable, y/o similares, y que no estén cubiertos por el seguro, la responsabilidad de la Arrendataria se extenderá al valor total del Equipo y los perjuicios, directos e indirectos, que le irrogare dicha pérdida.",
      "En este mismo sentido la Arrendataria asume la responsabilidad por todos los daños mecánicos y/o estructurales producidos por todas aquellas situaciones en que las pólizas de seguro contienen cláusulas de exclusión en razón del comportamiento o incumplimiento de quien tiene a su cargo el Equipo, y que no se contemplen en cláusulas adicionales.",
      "Lo mismo se aplicará respecto de la responsabilidad civil no cubierta por los seguros, o que exceda en sus montos y que resulte del uso, operación y transporte del Equipo por parte de la Arrendataria y/o sus dependientes, durante todo el tiempo en que lo tenga en su poder, entendiendo que estará en su poder desde la fecha de entrega indicada en el Acta de Entrega y Recepción, lo que ocurra primero, y hasta que el Equipo sea devuelto en el domicilio de la Arrendadora.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMA: SINIESTRO.",
    parrafos: [
      "En caso de siniestro, daño o pérdida del Equipo, cualquiera sea su causa y gravedad, la Arrendataria deberá informar a la Arrendadora de inmediato el siniestro y/o accidente sobrevenido, indicando su fecha, lugar y circunstancias, así como la naturaleza y determinación o estimación de los daños. En las 24 horas hábiles siguientes la Arrendadora informará y aportará la documentación requerida para respaldar informe del Siniestro, teniendo posteriormente la Arrendataria un plazo de 24 horas para reunir y entregar la información requerida.",
      "A) Siniestro parcial: el Contrato de arrendamiento continuará vigente en los mismos términos pactados debiendo la Arrendataria continuar pagando con los vencimientos correspondientes las rentas de arrendamiento. En caso de que la compañía aseguradora no pague la indemnización, o esta sea insuficiente por cobertura o exclusiones de la póliza, los costos de reparación para que el Equipo quede el mismo estado en que fue entregado y que no estén cubiertos por la póliza serán de costo de la Arrendataria. Dichas reparaciones deberán ser realizadas exclusivamente por el representante oficial del fabricante del Equipo.",
      "B) Siniestro total: se producirá la terminación del Contrato de arrendamiento del Equipo una vez que la Arrendataria haga entrega de los restos del Equipo siniestrado a la Arrendadora y de la información requerida para efectos de tramitar el siniestro, lo que implicará que la Arrendataria estará obligada a pagar las rentas de arrendamiento en los términos pactados hasta el cumplimiento copulativo de estas obligaciones.",
      "Si en definitiva la Compañía de Seguros no paga la indemnización, o ésta resulta insuficiente (parte no cubierta por la póliza), la Arrendataria deberá pagar el valor comercial del Equipo o la parte no cubierta por la Compañía de Seguros, según corresponda.",
    ],
  },
  {
    titulo: "CLÁUSULA UNDÉCIMA: EXENCIÓN DE RESPONSABILIDAD.",
    parrafos: [
      "Si la Arrendataria no pudiese hacer el uso esperado del Equipo, por cualquier causa que fuere, incluyendo el caso fortuito o fuerza mayor, y esté cubierta o no por el seguro correspondiente, las partes desde ya acuerdan que la Arrendadora no tendrá responsabilidad alguna.",
      "Las partes dejan constancia que la Arrendadora no tendrá ninguna responsabilidad respecto del uso que la Arrendataria haga del Equipo ni de los perjuicios, de cualquier naturaleza que sean, que dicho uso provoque.",
      "En caso que el Equipo sea un generador eléctrico, la Arrendadora no será responsable bajo ninguna circunstancia, de su instalación eléctrica, de la calidad de las conexiones ni de ninguna contingencia respecto de los procedimientos usados para poner en funcionamiento el Equipo.",
    ],
  },
  {
    titulo: "CLÁUSULA DUODÉCIMA: CESIÓN.",
    parrafos: [
      "La Arrendataria podrá ceder los derechos de uso o subarrendar los Equipos a un tercero, siempre y cuando cuente con autorización previa, expresa y por escrito de la Arrendadora. La Arrendataria será responsable de los daños derivados del mal uso o abuso operacional que haga el tercero del Equipo. El incumplimiento de esta obligación por parte de la Arrendataria, será considerada un incumplimiento grave, lo que ocasionará el término inmediato del Contrato y dará derecho a la Arrendadora a exigir, a título de cláusula penal, la suma equivalente a tres meses de Horas Mínimas Pactadas más la Renta de Arrendamiento hasta la entrega conforme del Equipo.",
      "La Arrendadora se reserva la facultad de ceder a terceros el Contrato o el derecho de cobrar las rentas de arrendamiento pactadas en el mismo y/o demás derechos que para ella emanan del Contrato, ya sea en dominio o en garantía, o bien para designar un diputado para su cobro. El cesionario gozará de todos los derechos, privilegios y garantías del cedente y subsistirá íntegramente las obligaciones y derechos de la Arrendataria.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO TERCERA: RESTITUCIÓN DEL EQUIPO.",
    parrafos: [
      "Al vencimiento del plazo de arriendo indicado en el punto 2 de las Condiciones Particulares, o a la época de terminación del Contrato, cualquiera sea la causa, la Arrendataria estará obligada a restituir el Equipo en lugar de devolución de la Arrendadora señalado en el punto 3 de las Condiciones Particulares, de acuerdo a lo especificado en el Contrato, en el estado en que fue entregada y considerando solamente el desgaste natural ocasionado por el uso normal que de él se hubiera hecho. Los costos del traslado para la restitución del Equipo serán de cargo de la Arrendataria y dicha restitución sólo se entenderá practicada cuando el Equipo se encuentre materialmente situado en el domicilio de la Arrendadora. Esta restitución se hará constar en el documento denominado “Acta de Entrega y Recepción (Check List)”, la que será firmada por las partes en el momento y lugar de restitución del bien. En caso que la Arrendataria no firme ni designe alguna persona para ello, la Arrendadora recabará la firma de dos testigos en dicho documento y la Arrendataria le reconocerá validez a lo que en ello se haga constar, aun cuando los testigos de referencia sean empleados de la Arrendadora.",
      "La Arrendataria responderá por daños derivados de mal uso o abuso del equipo, de acuerdo informe técnico final (posterior a la firma de Acta de Entrega y Recepción (Check List)), emitido por el área técnica de la Arrendadora, debiendo pagar a la Arrendadora las reparaciones y/o el importe de los componentes y accesorios que aparezcan como faltantes o dañados, así como el costo de su instalación. Para determinar los faltantes se estará a lo que se haya hecho constar en el “Acta de entrega y Recepción” del Equipo arrendado comparándose con lo establecido en la columna referida a la entrega. El Equipo arrendado deberá ser restituido con su respectiva guía de despacho emitida por la Arrendataria. Dentro de los 4 días hábiles siguientes a la restitución del Equipo, la Arrendadora deberá enviar a la Arrendataria un informe técnico del estado del Equipo, el cual podrá incluir el detalle de los daños reparables y/o listado de los elementos faltantes y/o dañados. Una vez recibido el informe técnico por parte de la Arrendataria, ésta tendrá un plazo de 4 días hábiles para realizar cualquier observación. En caso de haber observaciones, la Arrendadora deberá analizarlas y emitir un informe final dentro del plazo de 10 días corridos. Concluido el proceso, la Arrendadora tendrá un plazo de 30 días corridos para emitir un informe de liquidación con el presupuesto de reparaciones. Una vez realizada la reparación, la Arrendadora procederá a facturar los trabajos, debiendo la Arrendataria proceder con su pago dentro del plazo de 30 días corridos desde su notificación.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO CUARTA: RENOVACIÓN DEL PLAZO.",
    parrafos: [
      "Si la Arrendataria no restituye el Equipo cumplido el plazo de arriendo indicado en el punto 2 de las Condiciones Particulares, el plazo se entenderá renovado mes a mes en idénticos términos a los señalados en el presente Contrato hasta que se cumpla la restitución del Equipo. En el evento que la devolución se produzca sin completar un período completo de arriendo, la Arrendataria pagará la proporción que corresponda por concepto de horas mínimas de arriendo de acuerdo al número de días que mantuvo el Equipo en su poder o las horas efectivamente utilizadas si éstas superan las horas mínimas proporcionales.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO QUINTA: MANTENIMIENTO PREVENTIVO Y CORRECTIVO. SERVICIOS INCLUIDOS Y EXCLUIDOS DENTRO DEL CONTRATO.",
    parrafos: [
      "a) Servicios incluidos dentro de la renta de arrendamiento. Los siguientes servicios se encuentran incluidos dentro de la renta de arrendamiento y serán de cargo y costo de la Arrendadora, en los términos y condiciones que se indican a continuación.",
      "i. Mantenimiento Preventivo. Durante la vigencia del Contrato, siempre y cuando la Arrendataria cumpla con las condiciones de mantenimiento y cuidado definidas por el fabricante del Equipo y/o la Arrendadora, ésta última se hará cargo, bajo su responsabilidad y costo, del mantenimiento preventivo y/o correctivo (por fallas) del Equipo. El servicio de mantenimiento preventivo se ejecutará cumplida la cantidad de horas definidas en las pautas de mantenimiento de acuerdo a recomendaciones del fabricante del Equipo e informadas por la Arrendadora en el punto 2 de las Condiciones Particulares. La Arrendadora generará planes de intervención preventiva del equipo cuando corresponda, coordinando con la Arrendataria las fechas y duración de los trabajos, los cuales serán realizados en horario hábil, de lunes a viernes de 8:00 a 17:30 hrs. En caso que la Arrendataria requiera programar actividades fuera de este horario, la Arrendadora cotizará caso a caso (se excluyen trabajos en feriados irrenunciables).",
      "En caso de atraso o no cumplimiento del plan acordado de mantención preventiva, por causas atribuibles a la Arrendataria, o bien en caso de falta de cuidado, abuso, mal uso o daño operacional por parte de la Arrendataria, dará derecho a la Arrendadora a cobrar los costos en que ésta incurra como consecuencia del atraso o sobrecostos por visita fallida o costos consecuenciales por daños, mal uso o abuso operacional de el o los equipos.",
      "La mantención preventiva se realizará en las instalaciones de la Arrendataria y/o lugar de operación del Equipo. La Arrendataria dará todas las facilidades al personal de la Arrendadora para su ingreso y acreditación. El traslado, la alimentación, los EPP del personal técnico de la Arrendadora, así como los equipos, herramientas, insumos y repuestos necesarios, serán de cargo y responsabilidad de la Arrendadora. La Arrendataria se obliga a informar a la Arrendadora cada vez que el Equipo haya cumplido las horas indicadas para mantenimiento preventivo. En caso de no informar oportunamente, la Arrendataria será responsable de los daños directos y consecuenciales derivados de la falta de mantenimiento preventivo oportuno.",
      "ii. Mantenimiento Correctivo (Fallas). El arriendo incluye, sin costo para la Arrendataria, la mano de obra, refacciones de componentes, repuestos e insumos necesarios para efectuar reparaciones de fallas propias del Equipo, siempre y cuando éstas no sean consecuencia de culpa o negligencia de la Arrendataria. Las fallas serán evaluadas por Servicio Técnico Autorizado de la Marca mediante informe que deliberará si la causa es operacional o falla propia del equipo. Los costos asociados a reparaciones por fallas operacionales o por intervención de un tercero ajeno a la Arrendadora serán de cargo de la Arrendataria.",
      "b) Obligaciones de la Arrendataria en relación a los servicios de mantenimiento preventivo y correctivo a cargo de la Arrendadora. La Arrendataria asume las siguientes obligaciones esenciales cuyo incumplimiento será considerado gravísimo: (i) no realizar servicios de mantenimiento ni reparar el Equipo en talleres distintos a los del representante de la marca, ni usar repuestos alternativos sin autorización; (ii) ubicar el Equipo en un lugar apto y seguro para los mantenimientos; (iii) recibir los informes técnicos dentro de 6 días hábiles; (iv) dirigir los avisos por escrito al correo electrónico maquinarias@solterra.cl; (v) firmar el reporte de actividades ejecutadas; (vi) mantener el Equipo detenido por el tiempo que indique el personal técnico ante fallas detectadas.",
      "c) Exclusiones del Arrendamiento. Se encuentran excluidos de la Renta de Arrendamiento y serán de cargo de la Arrendataria, entre otros: los costos de mantenimiento/reparación por fallas atribuibles a la Arrendataria o por mal uso, abuso, negligencia u omisión; el cambio del Equipo por falla operacional de su responsabilidad; la mantención diaria (lubricación, revisión de niveles, engrase y limpieza); los desgastes de rodados y neumáticos por sobre el estándar (7% neumáticos y 3% rodados mensual); los traslados para mantenciones fuera de las instalaciones; insumos como combustible y rellenos de lubricantes; la contratación de operadores; y los deducibles de la póliza de seguros y costos no cubiertos por ésta. El hecho de que el Equipo no pueda ser utilizado no será motivo para negarse a pagar la Renta de Arrendamiento.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO SEXTA: TÉRMINO ANTICIPADO DEL CONTRATO POR INCUMPLIMIENTO.",
    parrafos: [
      "Serán causales de incumplimiento por parte de la Arrendataria, suficientes para que la Arrendadora pueda dar por terminado unilateralmente y de pleno derecho el Contrato, sin necesidad de declaración judicial alguna:",
      "a) La falta del pago oportuno de cualquier cantidad relativa a las rentas de arrendamiento o de cualquier otra cantidad que la Arrendataria deba pagar conforme al Contrato.",
      "b) Usar el Equipo en lugares o para trabajos distintos a los expresados en las Condiciones Particulares.",
      "c) Devolver anticipadamente el Equipo, o de cualquier modo poner término anticipado al Contrato sin el consentimiento previo y por escrito de la Arrendadora.",
      "d) Alterar o manipular el horómetro del Equipo, o no dar cuenta de un desperfecto en él y, en general, el incumplimiento de cualquier obligación emanada del Contrato que cause o pueda causar un perjuicio a la Arrendadora.",
      "e) El hecho que la Arrendataria caiga en insolvencia grave debidamente comprobada y/o presentación de una solicitud de reorganización y/o solicitud de liquidación.",
      "f) Si la Arrendataria dejare de cumplir sus obligaciones para con otros acreedores distintos de SOLTERRA SPA, en términos que hagan temer por la seguridad en el pago de sus compromisos.",
      "g) La Arrendataria no cumpla con las exigencias de mantenimiento definidas para el Equipo y/o por abuso, mal uso o daño excesivo del Equipo.",
      "h) Si la sociedad se disolviera por cualquier causa o modificare sus estatutos sin consentimiento previo de SOLTERRA SPA, encontrándose pendiente el pago de las rentas.",
      "i) En general, si a juicio exclusivo de SOLTERRA SPA la Arrendataria no diere cumplimiento exacto u oportuno a una cualquiera de sus obligaciones.",
      "La terminación del Contrato será comunicada por SOLTERRA SPA a la Arrendataria al correo electrónico indicado en el punto 8 de las Condiciones Particulares. La notificación se entenderá practicada al momento del envío del correo electrónico. En el evento de terminación anticipada, SOLTERRA SPA estará facultada para entrar a los lugares en que encontrare el Equipo a fin de hacerse cargo del mismo y retirarlo, sin autorización judicial alguna, para lo cual la Arrendataria le presta desde ya su autorización en términos irrevocables.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO SÉPTIMA: FACULTADES DE LA ARRENDADORA.",
    parrafos: [
      "En caso que la Arrendadora dé por terminado anticipadamente el Contrato podrá exigir, ya sea judicial o extrajudicialmente a la Arrendataria:",
      "a) La restitución inmediata del Equipo.",
      "b) El total de las rentas vencidas y/o saldos pendientes.",
      "c) El pago de los daños y perjuicios directos e indirectos que le ocasione el incumplimiento.",
      "d) Los gastos que causen las actividades tendientes a lograr la recuperación del Equipo, incluyendo las costas judiciales y honorarios de abogados.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO OCTAVA: TRASLADO.",
    parrafos: [
      "El costo del transporte necesario para trasladar el Equipo desde el lugar de la entrega hasta el lugar en que será utilizado, como así mismo para la devolución del mismo al término del Contrato, o para efectuar mantenciones o reparaciones en caso de requerirse, serán por cuenta y cargo de la Arrendataria. En este caso el arriendo comenzará al momento en que el Equipo esté disponible para ser transportado, y terminará cuando el Equipo sea descargado en las instalaciones de la Arrendadora.",
      "En el caso que la Arrendadora gestione el traslado y/o cualquier otro servicio externo, se adicionará, al cobro facturado por el proveedor del servicio, un doce por ciento (12%) por la gestión de dichos servicios.",
      "Sin perjuicio de lo señalado, en los casos en que deba trasladarse el Equipo desde la faena hasta las instalaciones de la Arrendadora, ya sea para sustituir el Equipo o para realizar reparaciones o mantenciones mayores, los costos serán asumidos por la Arrendataria o la Arrendadora dependiendo del origen del evento que motivó el traslado: si el origen es caso fortuito, fuerza mayor o mala operación del Equipo, los asume la Arrendataria; si es desgaste natural por uso normal, los asume la Arrendadora.",
    ],
  },
  {
    titulo: "CLÁUSULA DÉCIMO NOVENA: POLÍTICA GLOBAL ANTICORRUPCIÓN Y DE PREVENCIÓN DE DELITOS Y FRAUDE.",
    parrafos: [
      "La Arrendadora cumple y vela por el cumplimiento de todas las normas nacionales y extranjeras contra el cohecho, la corrupción, el lavado de activos, receptación de especies robadas y el financiamiento del terrorismo que le son aplicables (las “Normas Anticorrupción”), incluyendo la Ley N° 20.393 (Chile).",
      "La Arrendataria reconoce, declara y garantiza a la Arrendadora que: a) Cumplirá con las “Normas Anticorrupción”; b) No se involucrará en actividades, prácticas o conductas que constituyan ofensas o incumplimiento a las “Normas Anticorrupción”; c) Cumplirá con las políticas de la Arrendadora, incluyendo su Código de Conducta, principios de negocio, las políticas globales de anticorrupción, lavado de activos, receptación de especies robadas, cohecho y fraude y cualquier actualización de las mismas.",
      "La Arrendataria se obliga a no incurrir en las conductas constitutivas de los delitos antes mencionados y a denunciarlas a través del Canal de Consultas y Denuncias corporativo disponible en www.integridadcorporativa.cl, colaborando en toda investigación interna. El incumplimiento de cualquiera de los compromisos de esta cláusula constituirá un incumplimiento grave del Contrato y será motivo suficiente para la terminación unilateral inmediata y automática, sin derecho a indemnización a favor de la Arrendataria y sin requerir declaración judicial previa.",
    ],
  },
  {
    titulo: "CLÁUSULA VIGÉSIMA: DOMICILIO.",
    parrafos: [
      "Para todos los efectos del presente Contrato las partes fijan domicilio en la ciudad y comuna de Calama, sometiéndose a la jurisdicción de sus tribunales.",
    ],
  },
  {
    titulo: "CLÁUSULA VIGÉSIMA PRIMERA: PERSONERÍAS.",
    parrafos: [
      "Los comparecientes declaran contar con la personería vigente y suficiente para obligar a sus mandantes en los términos pactados en el Contrato.",
    ],
  },
];
