import { IconWarning } from '../sidebar-tsx/SidebarChat.js';


export const WarningBox = ({ text, onClick, className }: {text: string;onClick?: () => void;className?: string;}) => {

  return <div
    className={` beam-text-beam-warning beam-brightness-90 beam-opacity-90 beam-w-fit beam-text-xs beam-text-ellipsis ${


    onClick ? `hover:beam-brightness-75 beam-transition-all beam-duration-200 beam-cursor-pointer` : ""} beam-flex beam-items-center beam-flex-nowrap ${

    className} `}

    onClick={onClick}>
    
		<IconWarning
      size={14}
      className="beam-mr-1 beam-flex-shrink-0" />
    
		<span>{text}</span>
	</div>;
  // return <BeamSelectBox
  // 	options={[{ text: 'Please add a model!', value: null }]}
  // 	onChangeSelection={() => { }}
  // />
};